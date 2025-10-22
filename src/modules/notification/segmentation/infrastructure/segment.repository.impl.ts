import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SegmentRepository } from './segment.repository';
import { Segment } from '../domain/segment.entity';
import { SegmentQuery } from '../application/services/segment.service';

@Injectable()
export class SegmentRepositoryImpl implements SegmentRepository {
  constructor(@InjectModel('Segment') private readonly segmentModel: Model<any>) {}

  async save(segment: Segment): Promise<Segment> {
    const data = segment.toPersistence();
    const saved = await this.segmentModel.create(data);
    return Segment.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<Segment | null> {
    const document = await this.segmentModel.findById(id).exec();
    if (!document) return null;
    return Segment.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<Segment | null> {
    const document = await this.segmentModel.findOne({ name }).exec();
    if (!document) return null;
    return Segment.fromPersistence(document.toObject());
  }

  async findMany(
    query: SegmentQuery,
  ): Promise<{ segments: Segment[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
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

    if (query.createdBy) {
      filter.createdBy = query.createdBy;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      this.segmentModel.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.segmentModel.countDocuments(filter).exec(),
    ]);

    const segments = documents.map((doc) => Segment.fromPersistence(doc.toObject()));

    return {
      segments,
      total,
      page,
      limit,
    };
  }

  async findActive(): Promise<Segment[]> {
    const documents = await this.segmentModel.find({ isActive: true }).exec();
    return documents.map((doc) => Segment.fromPersistence(doc.toObject()));
  }

  async findByUser(userId: string): Promise<Segment[]> {
    const documents = await this.segmentModel.find({ createdBy: userId }).exec();
    return documents.map((doc) => Segment.fromPersistence(doc.toObject()));
  }

  async search(searchTerm: string): Promise<Segment[]> {
    const documents = await this.segmentModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
    return documents.map((doc) => Segment.fromPersistence(doc.toObject()));
  }

  async delete(id: string): Promise<void> {
    await this.segmentModel.findByIdAndDelete(id).exec();
  }
}
