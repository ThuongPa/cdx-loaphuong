import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryService } from './application/services/category.service';
import { CategoryRepositoryImpl } from './infrastructure/category.repository.impl';
import { Category, CategorySchema } from './category.schema';
import { CategoryController } from './category.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Category', schema: CategorySchema }])],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    {
      provide: 'CategoryRepository',
      useClass: CategoryRepositoryImpl,
    },
  ],
  exports: [CategoryService],
})
export class CategoryModule {}
