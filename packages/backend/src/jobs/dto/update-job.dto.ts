import { IsOptional, IsString, Length } from "class-validator";

/** All fields optional — partial update. */
export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;
}
