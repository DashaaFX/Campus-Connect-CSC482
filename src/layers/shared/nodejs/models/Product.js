//Baljinnyam Puntsagnorov
import { BaseModel } from './BaseModel.js';
import { generateAssetUrl, getCloudFrontDomain } from '../utils/urlUtils.js';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb.js';

export class ProductModel extends BaseModel {
  constructor() {
    super(process.env.PRODUCTS_TABLE);
  }

  async create(productData) {
    const searchTerms = this.generateSearchTerms(productData);
    // Only use 'title' for product naming
    const product = {
      ...productData,
      quantitySold: 0,
      searchTerms,
      status: productData.status || 'active',
      condition: productData.condition || 'new',
      images: productData.images || [],
      // Digital product metadata
      isDigital: !!productData.isDigital,
      digitalFormat: productData.digitalFormat || null,
      documentKey: productData.documentKey || null,
      documentOriginalName: productData.documentOriginalName || null,
      previewImage: productData.previewImage || null,
      digitalStatus: productData.isDigital ? (productData.digitalStatus || 'ready') : null,
      fileSizeBytes: productData.fileSizeBytes || null,
      digitalAutoComplete: productData.isDigital ? !!productData.digitalAutoComplete : false
    };

    // Ensure images are properly formatted with CloudFront/S3 URLs
    if (product.images && Array.isArray(product.images)) {
      product.images = product.images.map(img => {
        if (img && typeof img === 'string' && !img.startsWith('http')) {
          return generateAssetUrl(
            img,
            process.env.ENVIRONMENT || 'dev',
            process.env.AWS_REGION || 'us-east-1',
            getCloudFrontDomain()
          );
        }
        return img;
      });
    }
    
    return super.create(product);
  }

  generateSearchTerms(productData) {
    const searchableFields = [
      productData.title,
      productData.description,
      productData.category,
      productData.condition,
      productData.isDigital ? 'digital' : null,
      productData.digitalFormat || null
    ].filter(Boolean);
    return searchableFields.join(' ').toLowerCase();
  }
  
  // Enhanced getById for multiple Id formats
  async getById(id) {
    // First try the regular getById from BaseModel
    const product = await super.getById(id);
    
    if (product) {
      return product;
    }
    
    // If not found, try alternative approaches
    try {
      // Get all products and search by id/_id
      const allProducts = await this.getAll();
      
      const foundProduct = allProducts.find(p => 
        p.id === id || 
        p._id === id || 
        p.id?.toString() === id?.toString() || 
        p._id?.toString() === id?.toString()
      );
      
      return foundProduct;
    } catch (error) {
      console.error('Error in enhanced getById:', error);
      return null;
    }
  }

  async getBySeller(seller) {
    return this.queryByIndex(
      'SellerIndex',
      'seller = :seller AND #status = :status',
      { 
        ':seller': seller,
        ':status': 'active'
      },
      {
        '#status': 'status'
      }
    );
  }
  
  async getBySellerId(sellerId) {
    // Use query if there's a SellerIndex, otherwise scan and filter
    try {
      const allProducts = await this.getAll();
      
      // Only filter by sellerId for consistency
      const filteredProducts = allProducts.filter(product => {
        return product.sellerId === sellerId;
      });
      
      return filteredProducts;
    } catch (error) {
      console.error('Error in getBySellerId:', error);
      throw error;
    }
  }

  async getByCategory(category) {
    // Temporarily use scan instead of query to debug
    try {
      const allProducts = await this.getAll();
      
      const filtered = allProducts.filter(product => {
        return product.category === category && product.status === 'active';
      });
      
      return filtered;
    } catch (error) {
      console.error('Error in getByCategory:', error);
      throw error;
    }
  }

  async search(searchTerm, category = null) {
    // Use scan and filter for now
    const allProducts = await this.getAll();
    
    let filtered = allProducts.filter(product => 
      product.status === 'active' && 
      product.searchTerms && 
      product.searchTerms.includes(searchTerm.toLowerCase())
    );

    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }

    return filtered;
  }

  async updateQuantitySold(productId, quantitySold) {
    return this.update(productId, { quantitySold });
  }

  async deactivate(productId) {
    return this.update(productId, { status: 'inactive' });
  }

  // Legacy method for backward compatibility
  async createProduct(productData) {
    return this.create(productData);
  }

  // Atomic increment for digital download count to avoid race conditions
  async incrementDigitalDownloadCount(productId) {
    try {
      const timestamp = new Date().toISOString();
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id: productId },
        // If attribute does not exist, ADD initializes it to :inc (1). Also bump updatedAt.
        UpdateExpression: 'ADD digitalDownloadCount :inc SET updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':updatedAt': timestamp
        },
        ReturnValues: 'UPDATED_NEW'
      });
      const result = await docClient.send(command);
      return result.Attributes?.digitalDownloadCount;
    } catch (err) {
      // Swallow metric failure; not critical to user flow
      console.error('incrementDigitalDownloadCount failed:', err.message);
      return null;
    }
  }
}

export const productModel = new ProductModel();
