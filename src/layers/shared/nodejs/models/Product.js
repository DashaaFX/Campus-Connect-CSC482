import { BaseModel } from './BaseModel.js';

export class ProductModel extends BaseModel {
  constructor() {
    super(process.env.PRODUCTS_TABLE);
  }

  async create(productData) {
    const searchTerms = this.generateSearchTerms(productData);
    
    const product = {
      ...productData,
      quantitySold: 0,
      searchTerms,
      status: productData.status || 'active',
      condition: productData.condition || 'new',
      images: productData.images || []
    };

    return super.create(product);
  }

  generateSearchTerms(productData) {
    const searchableFields = [
      productData.name,
      productData.description,
      productData.category,
      productData.condition
    ].filter(Boolean);
    
    return searchableFields.join(' ').toLowerCase();
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

  async getByCategory(category) {
    return this.queryByIndex(
      'CategoryIndex',
      'category = :category AND #status = :status',
      { 
        ':category': category,
        ':status': 'active'
      },
      {
        '#status': 'status'
      }
    );
  }

  async search(searchTerm, category = null) {
    // For simple implementation, we'll scan and filter
    // In production, consider using Amazon OpenSearch
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
}

export const productModel = new ProductModel();
