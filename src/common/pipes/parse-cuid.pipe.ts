import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException(`${metadata.data} is required`);
    }

    // Basic CUID validation (starts with 'c' and is 25 characters long)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(value)) {
      throw new BadRequestException(`${metadata.data} must be a valid CUID`);
    }

    return value;
  }
}
