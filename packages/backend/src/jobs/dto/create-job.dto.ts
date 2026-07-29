import { IsOptional, IsString, Length } from "class-validator";

export class CreateJobDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  company?: string;

  @IsString()
  @Length(1, 10000)
  content!: string;
}
