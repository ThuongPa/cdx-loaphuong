import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbTestRepository } from './ab-test.repository';
import { AbTest } from '../domain/ab-test.entity';
import { AbTestDocument } from '../ab-test.schema';

@Injectable()
export class AbTestRepositoryImpl implements AbTestRepository {
  constructor(@InjectModel('AbTest') private readonly abTestModel: Model<AbTestDocument>) {}

  async save(abTest: AbTest): Promise<AbTest> {
    const data = abTest.toPersistence();
    const saved = await this.abTestModel.create(data);
    return AbTest.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<AbTest | null> {
    const document = await this.abTestModel.findById(id).exec();
    if (!document) return null;
    return AbTest.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<AbTest | null> {
    const document = await this.abTestModel.findOne({ name }).exec();
    if (!document) return null;
    return AbTest.fromPersistence(document.toObject());
  }

  async findAll(
    filters: any,
    sort: any,
    pagination: any,
  ): Promise<{ tests: AbTest[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query = this.buildQuery(filters);
    const sortOptions = this.buildSortOptions(sort);

    const [documents, total] = await Promise.all([
      this.abTestModel.find(query).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.abTestModel.countDocuments(query).exec(),
    ]);

    const tests = documents.map((doc) => AbTest.fromPersistence(doc.toObject()));

    return {
      tests,
      total,
      page,
      limit,
    };
  }

  async findByIds(ids: string[]): Promise<AbTest[]> {
    const documents = await this.abTestModel.find({ _id: { $in: ids } }).exec();
    return documents.map((doc) => AbTest.fromPersistence(doc.toObject()));
  }

  async findByStatus(status: string): Promise<AbTest[]> {
    const documents = await this.abTestModel.find({ status }).exec();
    return documents.map((doc) => AbTest.fromPersistence(doc.toObject()));
  }

  async findEligibleForUser(
    userId: string,
    userSegments?: string[],
    categories?: string[],
    channels?: string[],
  ): Promise<AbTest[]> {
    const query: any = {
      status: 'active',
      $or: [
        { 'targetAudience.userIds': userId },
        { 'targetAudience.userSegments': { $in: userSegments || [] } },
        { 'targetAudience.categories': { $in: categories || [] } },
        { 'targetAudience.channels': { $in: channels || [] } },
      ],
    };

    const documents = await this.abTestModel.find(query).exec();
    return documents.map((doc) => AbTest.fromPersistence(doc.toObject()));
  }

  async deleteById(id: string): Promise<void> {
    await this.abTestModel.findByIdAndDelete(id).exec();
  }

  private buildQuery(filters: any): any {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.testType) {
      query.testType = filters.testType;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  private buildSortOptions(sort: any): any {
    if (!sort) return { createdAt: -1 };

    const sortOptions: any = {};
    for (const [field, direction] of Object.entries(sort)) {
      sortOptions[field] = direction === 'asc' ? 1 : -1;
    }

    return sortOptions;
  }
}
