import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryRepository } from './category.repository';
import { Category } from '../domain/category.entity';
import { CategoryQuery } from '../application/services/category.service';

@Injectable()
export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(@InjectModel('Category') private readonly categoryModel: Model<any>) {}

  async save(category: Category): Promise<Category> {
    const data = category.toPersistence();
    const saved = await this.categoryModel.create(data);
    return Category.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<Category | null> {
    const document = await this.categoryModel.findById(id).exec();
    if (!document) return null;
    return Category.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<Category | null> {
    const document = await this.categoryModel.findOne({ name }).exec();
    if (!document) return null;
    return Category.fromPersistence(document.toObject());
  }

  async findMany(
    query: CategoryQuery,
  ): Promise<{ categories: Category[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.parentId !== undefined) {
      filter.parentId = query.parentId;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.createdBy) {
      filter.createdBy = query.createdBy;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      this.categoryModel.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    const categories = documents.map((doc) => Category.fromPersistence(doc.toObject()));

    return {
      categories,
      total,
      page,
      limit,
    };
  }

  async findTree(): Promise<Category[]> {
    const documents = await this.categoryModel.find({ parentId: null }).exec();
    return documents.map((doc) => Category.fromPersistence(doc.toObject()));
  }

  async findByUser(userId: string): Promise<Category[]> {
    const documents = await this.categoryModel.find({ createdBy: userId }).exec();
    return documents.map((doc) => Category.fromPersistence(doc.toObject()));
  }

  async search(searchTerm: string): Promise<Category[]> {
    const documents = await this.categoryModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
    return documents.map((doc) => Category.fromPersistence(doc.toObject()));
  }

  async delete(id: string): Promise<void> {
    await this.categoryModel.findByIdAndDelete(id).exec();
  }
}
