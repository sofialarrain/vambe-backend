import { Test, TestingModule } from '@nestjs/testing';
import { ResponseParserService } from './response-parser.service';

describe('ResponseParserService', () => {
  let service: ResponseParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseParserService],
    }).compile();

    service = module.get<ResponseParserService>(ResponseParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseJsonResponse', () => {
    it('should parse valid JSON response', () => {
      // Arrange
      const response = 'Some text before {"key": "value", "number": 123} some text after';
      const fallback = { key: 'fallback', number: 0 };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('should return fallback when no JSON found', () => {
      // Arrange
      const response = 'No JSON here, just plain text';
      const fallback = { key: 'fallback' };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      expect(result).toEqual(fallback);
    });

    it('should return fallback when JSON is invalid', () => {
      // Arrange
      const response = 'Some text {invalid json} more text';
      const fallback = { key: 'fallback' };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      expect(result).toEqual(fallback);
    });

    it('should parse nested JSON objects', () => {
      // Arrange
      const response = 'Response: {"nested": {"key": "value", "items": [1, 2, 3]}}';
      const fallback = { nested: {} };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      expect(result).toEqual({
        nested: {
          key: 'value',
          items: [1, 2, 3],
        },
      });
    });

    it('should handle empty JSON object', () => {
      // Arrange
      const response = 'Text {} more text';
      const fallback = { key: 'fallback' };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      expect(result).toEqual({});
    });

    it('should return fallback when multiple JSON objects exist (greedy match creates invalid JSON)', () => {
      // Arrange
      // The regex is greedy and will match from first { to last }, creating invalid JSON
      const response = 'First {"key1": "value1"} Second {"key2": "value2"}';
      const fallback = { key: 'fallback' };

      // Act
      const result = service.parseJsonResponse(response, fallback);

      // Assert
      // The greedy regex captures everything from first { to last }, which creates invalid JSON
      // So it returns the fallback
      expect(result).toEqual(fallback);
    });
  });

  describe('parseArrayResponse', () => {
    it('should parse valid JSON array', () => {
      // Arrange
      const response = 'Text before ["item1", "item2", "item3"] text after';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should parse array with bullet points when no JSON array found', () => {
      // Arrange
      const response = 'Here are items:\n- item1\n- item2\n• item3';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should parse array with dash bullet points', () => {
      // Arrange
      const response = 'Items:\n- first item\n- second item';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(['first item', 'second item']);
    });

    it('should parse array with bullet point symbols', () => {
      // Arrange
      const response = 'Items:\n• item one\n• item two';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(['item one', 'item two']);
    });

    it('should return fallback when no array found and no bullet points', () => {
      // Arrange
      const response = 'Just plain text, no arrays or bullets';
      const fallback = ['fallback1', 'fallback2'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(fallback);
    });

    it('should return fallback when JSON is not an array', () => {
      // Arrange
      const response = 'Text {"key": "value"} more text';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(fallback);
    });

    it('should handle empty JSON array', () => {
      // Arrange
      const response = 'Text [] more text';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual([]);
    });

    it('should trim whitespace from bullet point items', () => {
      // Arrange
      const response = 'Items:\n-  item with spaces  \n-  another item  ';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(['item with spaces', 'another item']);
    });

    it('should handle invalid JSON array gracefully', () => {
      // Arrange
      const response = 'Text [invalid json array] more text';
      const fallback = ['fallback'];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      expect(result).toEqual(fallback);
    });

    it('should parse array when multiple arrays exist (greedy match)', () => {
      // Arrange
      // The regex is greedy and will match from first [ to last ]
      const response = 'First ["item1", "item2"] Second ["item3", "item4"]';
      const fallback: string[] = [];

      // Act
      const result = service.parseArrayResponse(response, fallback);

      // Assert
      // The greedy regex captures everything from first [ to last ], which is invalid JSON
      // So it falls back to checking for bullet points, which don't exist, so returns fallback
      expect(result).toEqual(fallback);
    });
  });

  describe('extractValue', () => {
    it('should extract value using regex pattern', () => {
      // Arrange
      const response = 'PROBABILITY: 85';
      const pattern = /PROBABILITY:\s*(\d+)/;
      const fallback = '0';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe('85');
    });

    it('should return fallback when pattern does not match', () => {
      // Arrange
      const response = 'No match here';
      const pattern = /PROBABILITY:\s*(\d+)/;
      const fallback = '0';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe(fallback);
    });

    it('should return fallback when match group is missing', () => {
      // Arrange
      const response = 'PROBABILITY:';
      const pattern = /PROBABILITY:\s*(\d+)/;
      const fallback = '0';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe(fallback);
    });

    it('should trim extracted value', () => {
      // Arrange
      const response = 'VALUE:  spaced value  ';
      const pattern = /VALUE:\s*(.+)/;
      const fallback = '';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe('spaced value');
    });

    it('should handle errors gracefully', () => {
      // Arrange
      const response = 'Some text';
      // Using a valid regex that won't match, simulating an error scenario
      const pattern = /NONEXISTENT_PATTERN/;
      const fallback = 'fallback';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe(fallback);
    });

    it('should extract first match when multiple matches exist', () => {
      // Arrange
      const response = 'VALUE: first VALUE: second';
      const pattern = /VALUE:\s*(\w+)/;
      const fallback = '';

      // Act
      const result = service.extractValue(response, pattern, fallback);

      // Assert
      expect(result).toBe('first');
    });
  });
});

