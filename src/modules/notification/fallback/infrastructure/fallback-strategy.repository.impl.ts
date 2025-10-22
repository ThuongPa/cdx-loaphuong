import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FallbackStrategyRepository } from './fallback-strategy.repository';
import { FallbackStrategy } from '../domain/fallback-strategy.entity';
import { FallbackStrategyQuery } from '../application/services/fallback-strategy.service';

@Injectable()
export class FallbackStrategyRepositoryImpl implements FallbackStrategyRepository {
  constructor(
    @InjectModel('FallbackStrategy') private readonly fallbackStrategyModel: Model<any>,
  ) {}

  async save(strategy: FallbackStrategy): Promise<FallbackStrategy> {
    const data = strategy.toPersistence();
    const saved = await this.fallbackStrategyModel.create(data);
    return FallbackStrategy.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<FallbackStrategy | null> {
    const document = await this.fallbackStrategyModel.findById(id).exec();
    if (!document) return null;
    return FallbackStrategy.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<FallbackStrategy | null> {
    const document = await this.fallbackStrategyModel.findOne({ name }).exec();
    if (!document) return null;
    return FallbackStrategy.fromPersistence(document.toObject());
  }

  async findByPriority(priority: number): Promise<FallbackStrategy | null> {
    const document = await this.fallbackStrategyModel.findOne({ priority }).exec();
    if (!document) return null;
    return FallbackStrategy.fromPersistence(document.toObject());
  }

  async findMany(
    query: FallbackStrategyQuery,
  ): Promise<{ strategies: FallbackStrategy[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'priority', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.priority !== undefined) {
      filter.priority = query.priority;
    }

    if (query.createdBy) {
      filter.createdBy = query.createdBy;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      this.fallbackStrategyModel.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.fallbackStrategyModel.countDocuments(filter).exec(),
    ]);

    const strategies = documents.map((doc) => FallbackStrategy.fromPersistence(doc.toObject()));

    return {
      strategies,
      total,
      page,
      limit,
    };
  }

  async findActive(): Promise<FallbackStrategy[]> {
    const documents = await this.fallbackStrategyModel
      .find({ isActive: true })
      .sort({ priority: 1 })
      .exec();
    return documents.map((doc) => FallbackStrategy.fromPersistence(doc.toObject()));
  }

  async findByPriorityOrder(): Promise<FallbackStrategy[]> {
    const documents = await this.fallbackStrategyModel.find().sort({ priority: 1 }).exec();
    return documents.map((doc) => FallbackStrategy.fromPersistence(doc.toObject()));
  }

  async findByUser(userId: string): Promise<FallbackStrategy[]> {
    const documents = await this.fallbackStrategyModel.find({ createdBy: userId }).exec();
    return documents.map((doc) => FallbackStrategy.fromPersistence(doc.toObject()));
  }

  async search(searchTerm: string): Promise<FallbackStrategy[]> {
    const documents = await this.fallbackStrategyModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
    return documents.map((doc) => FallbackStrategy.fromPersistence(doc.toObject()));
  }

  async delete(id: string): Promise<void> {
    await this.fallbackStrategyModel.findByIdAndDelete(id).exec();
  }
}
