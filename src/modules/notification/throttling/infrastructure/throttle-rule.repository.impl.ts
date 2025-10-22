import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ThrottleRuleRepository } from './throttle-rule.repository';
import { ThrottleRule } from '../domain/throttle-rule.entity';
import { ThrottleRuleQuery } from '../application/services/throttle-rule.service';

@Injectable()
export class ThrottleRuleRepositoryImpl implements ThrottleRuleRepository {
  constructor(@InjectModel('ThrottleRule') private readonly throttleRuleModel: Model<any>) {}

  async save(rule: ThrottleRule): Promise<ThrottleRule> {
    const data = rule.toPersistence();
    const saved = await this.throttleRuleModel.create(data);
    return ThrottleRule.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<ThrottleRule | null> {
    const document = await this.throttleRuleModel.findById(id).exec();
    if (!document) return null;
    return ThrottleRule.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<ThrottleRule | null> {
    const document = await this.throttleRuleModel.findOne({ name }).exec();
    if (!document) return null;
    return ThrottleRule.fromPersistence(document.toObject());
  }

  async findMany(
    query: ThrottleRuleQuery,
  ): Promise<{ rules: ThrottleRule[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.type) {
      filter.type = query.type;
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
      this.throttleRuleModel.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.throttleRuleModel.countDocuments(filter).exec(),
    ]);

    const rules = documents.map((doc) => ThrottleRule.fromPersistence(doc.toObject()));

    return {
      rules,
      total,
      page,
      limit,
    };
  }

  async findActive(): Promise<ThrottleRule[]> {
    const documents = await this.throttleRuleModel.find({ isActive: true }).exec();
    return documents.map((doc) => ThrottleRule.fromPersistence(doc.toObject()));
  }

  async findByType(type: string): Promise<ThrottleRule[]> {
    const documents = await this.throttleRuleModel.find({ type }).exec();
    return documents.map((doc) => ThrottleRule.fromPersistence(doc.toObject()));
  }

  async findByUser(userId: string): Promise<ThrottleRule[]> {
    const documents = await this.throttleRuleModel.find({ createdBy: userId }).exec();
    return documents.map((doc) => ThrottleRule.fromPersistence(doc.toObject()));
  }

  async search(searchTerm: string): Promise<ThrottleRule[]> {
    const documents = await this.throttleRuleModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
    return documents.map((doc) => ThrottleRule.fromPersistence(doc.toObject()));
  }

  async delete(id: string): Promise<void> {
    await this.throttleRuleModel.findByIdAndDelete(id).exec();
  }
}
