import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });

import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

async function extractText(filePath: string, fileType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n");
}

async function extractWithDeepSeek(rawText: string): Promise<any> {
  const prompt = `从以下简历文本中提取结构化信息，返回JSON格式。

{
  "name": "姓名",
  "contact": { "phone": "手机号", "email": "邮箱", "location": "城市" },
  "summary": "个人摘要",
  "workExperience": [{ "company": "公司", "position": "职位", "duration": "时间", "description": "描述" }],
  "projectExperience": [{ "name": "项目名", "role": "角色", "duration": "时间", "description": "描述" }],
  "education": [{ "school": "学校", "major": "专业", "degree": "学历", "duration": "时间" }],
  "skills": ["技能1", "技能2"]
}

简历文本：
${rawText}`;

  const res = await fetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);
  const data = await res.json() as any;
  return JSON.parse(data.choices[0].message.content);
}

const worker = new Worker("resume-parse", async (job: Job) => {
  const { resumeId } = job.data;
  const resume = await prisma.resume.findUniqueOrThrow({ where: { id: resumeId } });

  try {
    const rawText = await extractText(resume.filePath, resume.fileType);
    await prisma.resume.update({ where: { id: resumeId }, data: { rawText } });

    if (rawText.trim().length < 200) {
      await prisma.resume.update({ where: { id: resumeId }, data: { parseStatus: "failed" } });
      return;
    }

    const parseResult = await extractWithDeepSeek(rawText);
    await prisma.resume.update({
      where: { id: resumeId },
      data: { parseResult, parseStatus: "parsed" },
    });
  } catch (err) {
    await prisma.resume.update({ where: { id: resumeId }, data: { parseStatus: "failed" } });
    throw err;
  }
}, {
  connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  concurrency: 2,
});

console.log("Parse worker started");