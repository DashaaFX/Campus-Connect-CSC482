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

    // Ensure images are properly formatted with https:// prefix
    if (product.images && Array.isArray(product.images)) {
      product.images = product.images.map(img => {
        if (img && typeof img === 'string' && !img.startsWith('http')) {
          return `https://campus-connect-uploads-${process.env.ENVIRONMENT || 'dev'}.s3.amazonaws.com/${img}`;
        }
        return img;
      });
    }
    
    return super.create(product);
  }

  generateSearchTerms(productData) {
    const searchableFields = [
      productData.name || productData.title,
      productData.description,
      productData.category,
      productData.condition
    ].filter(Boolean);
    
    return searchableFields.join(' ').toLowerCase();
  }
  
  // Enhanced getById that tries multiple id formats
  async getById(id) {
    console.log(`ProductModel.getById called with id: ${id}`);
    
    // First try the regular getById from BaseModel
    const product = await super.getById(id);
    
    if (product) {
      console.log(`Product found directly with id: ${id}`);
      return product;
    }
    
    // If not found, try alternative approaches
    console.log(`Product not found with direct id, trying alternative methods`);
    
    try {
      // Get all products and search by id/_id
      const allProducts = await this.getAll();
      console.log(`Searching among ${allProducts.length} products for id: ${id}`);
      
      const foundProduct = allProducts.find(p => 
        p.id === id || 
        p._id === id || 
        p.id?.toString() === id?.toString() || 
        p._id?.toString() === id?.toString()
      );
      
      if (foundProduct) {
        console.log(`Found product using alternative ID match: ${foundProduct.id || foundProduct._id}`);
      } else {
        console.log(`Product not found with any ID format: ${id}`);
      }
      
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
    console.log('Fetching products for sellerId:', sellerId);
    
    // For backward compatibility, try to get all products and filter
    try {
      const allProducts = await this.getAll();
      console.log('Total products found:', allProducts.length);
      
      // Filter products where sellerId or userId matches
      const filteredProducts = allProducts.filter(product => {
        const match = (product.sellerId === sellerId || product.userId === sellerId);
        console.log(`Product ${product.id || product._id}: sellerId=${product.sellerId}, userId=${product.userId}, match=${match}`);
        return match;
      });
      
      console.log('Filtered products for seller:', filteredProducts.length);
      return filteredProducts;
    } catch (error) {
      console.error('Error in getBySellerId:', error);
      throw error;
    }
  }

  async getByCategory(category) {
    // Temporarily use scan instead of query to debug
    try {
      console.log('Getting products by category:', category);
      const allProducts = await this.getAll();
      console.log('Total products found:', allProducts.length);
      
      const filtered = allProducts.filter(product => {
        console.log('Product category:', product.category, 'Looking for:', category);
        return product.category === category && product.status === 'active';
      });
      
      console.log('Filtered products:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('Error in getByCategory:', error);
      throw error;
    }
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
