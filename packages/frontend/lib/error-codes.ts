/**
 * Maps backend ErrorCode to user-facing Chinese messages.
 * Fallback message used when code is unknown.
 */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PARAMS: "请求参数不正确，请检查输入",
  UNAUTHORIZED: "请先登录",
  QUOTA_EXCEEDED: "积分不足",
  RESOURCE_NOT_FOUND: "数据不存在或已删除",
  FILE_TYPE_UNSUPPORTED: "仅支持 PDF 和 Word (.docx) 格式",
  FILE_TOO_LARGE: "文件大小超过限制（最大 5MB）",
  PARSE_FAILED: "简历解析失败，请确认文件内容完整后重新上传",
  INTERNAL_ERROR: "服务器内部错误，请稍后再试",
  AI_SERVICE_UNAVAILABLE: "AI 服务暂时不可用，请稍后重试",
  DUPLICATE_NAME: "该名称已存在，请换一个",
};

export function getErrorMessage(json: any): string {
  // 后端返回的具体提示优先（如"该手机号已注册"），映射表兜底
  if (json?.error?.message) {
    return json.error.message;
  }
  const code = json?.error?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return "操作失败，请重试";
}
