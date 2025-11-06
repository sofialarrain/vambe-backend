import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PainPointDto, TechnicalRequirementDto, VolumeVsConversionDto } from '../../common/dto/analytics';

@Injectable()
export class PainPointsService {
  private readonly logger = new Logger(PainPointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTopPainPoints(): Promise<PainPointDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        painPoints: { isEmpty: false },
      },
    });

    const normalizePainPoint = (painPoint: string): string => {
      return painPoint
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
    };

    const painPointMap = new Map<string, { 
      canonicalName: string;
      nameCount: Map<string, number>;
      count: number; 
      closed: number;
    }>();

    for (const client of clients) {
      for (const painPoint of client.painPoints) {
        const normalized = normalizePainPoint(painPoint);
        
        if (!painPointMap.has(normalized)) {
          painPointMap.set(normalized, {
            canonicalName: painPoint.trim(),
            nameCount: new Map([[painPoint.trim(), 1]]),
            count: 0,
            closed: 0,
          });
        }
        
        const entry = painPointMap.get(normalized)!;
        entry.count++;
        if (client.closed) entry.closed++;
        
        const trimmedName = painPoint.trim();
        entry.nameCount.set(trimmedName, (entry.nameCount.get(trimmedName) || 0) + 1);
        
        let maxCount = 0;
        let mostCommonName = entry.canonicalName;
        for (const [name, count] of entry.nameCount.entries()) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonName = name;
          }
        }
        entry.canonicalName = mostCommonName;
      }
    }

    return Array.from(painPointMap.entries())
      .map(([normalized, data]) => ({
        painPoint: data.canonicalName,
        count: data.count,
        conversionRate: parseFloat(((data.closed / data.count) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getTopTechnicalRequirements(): Promise<TechnicalRequirementDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        technicalRequirements: { isEmpty: false },
      },
    });

    const requirementMap = new Map<string, number>();

    for (const client of clients) {
      for (const requirement of client.technicalRequirements) {
        requirementMap.set(requirement, (requirementMap.get(requirement) || 0) + 1);
      }
    }

    return Array.from(requirementMap.entries())
      .map(([requirement, count]) => ({ requirement, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getVolumeVsConversion(): Promise<VolumeVsConversionDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        interactionVolume: { not: null },
      },
    });

    const ranges = [
      { label: '0-50', min: 0, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '101-200', min: 101, max: 200 },
      { label: '201-300', min: 201, max: 300 },
      { label: '300+', min: 301, max: Infinity },
    ];

    return ranges.map((range) => {
      const inRange = clients.filter(
        (c) => c.interactionVolume! >= range.min && c.interactionVolume! <= range.max,
      );
      const closed = inRange.filter((c) => c.closed).length;
      const count = inRange.length;

      return {
        volumeRange: range.label,
        count,
        conversionRate: count > 0 ? parseFloat(((closed / count) * 100).toFixed(2)) : 0,
      };
    });
  }
}

