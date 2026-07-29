import { IsString, Length } from "class-validator";

export class ExportDto {
  @IsString()
  @Length(1, 50000)
  markdown!: string;
}
