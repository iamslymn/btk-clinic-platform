// Additional simplified services for other entities
// Clean, portable data fetching that works with any backend

import { dataAccess } from '../data-access/config';
import type { SimpleRepresentative, SimpleDoctor, SimpleProduct, SimpleBrand } from '../data-access/interfaces';

// Representative Service
export class RepresentativeService {
  async getAll(): Promise<SimpleRepresentative[]> {
    try {
      return await dataAccess.representatives.findAll();
    } catch (error) {
      console.error('Failed to fetch representatives:', error);
      throw new Error('Failed to load representatives');
    }
  }

  async getById(id: string): Promise<SimpleRepresentative | null> {
    try {
      return await dataAccess.representatives.findById(id);
    } catch (error) {
      console.error('Failed to fetch representative:', error);
      return null;
    }
  }

  async getByManager(managerId: string): Promise<SimpleRepresentative[]> {
    try {
      return await dataAccess.representatives.findByManager(managerId);
    } catch (error) {
      console.error('Failed to fetch representatives by manager:', error);
      return [];
    }
  }
}

// Doctor Service
export class DoctorService {
  async getAll(): Promise<SimpleDoctor[]> {
    try {
      return await dataAccess.doctors.findAll();
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      throw new Error('Failed to load doctors');
    }
  }

  async getById(id: string): Promise<SimpleDoctor | null> {
    try {
      return await dataAccess.doctors.findById(id);
    } catch (error) {
      console.error('Failed to fetch doctor:', error);
      return null;
    }
  }

  async getByIds(ids: string[]): Promise<SimpleDoctor[]> {
    try {
      return await dataAccess.doctors.findByIds(ids);
    } catch (error) {
      console.error('Failed to fetch doctors by IDs:', error);
      return [];
    }
  }

  async searchDoctors(query: string): Promise<SimpleDoctor[]> {
    try {
      const allDoctors = await this.getAll();
      
      // Simple client-side search - can be moved to backend later
      const searchTerm = query.toLowerCase();
      return allDoctors.filter(doctor => 
        doctor.first_name.toLowerCase().includes(searchTerm) ||
        doctor.last_name.toLowerCase().includes(searchTerm) ||
        doctor.specialty.toLowerCase().includes(searchTerm) ||
        doctor.address.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Failed to search doctors:', error);
      return [];
    }
  }
}

// Product Service
export class ProductService {
  async getAll(): Promise<SimpleProduct[]> {
    try {
      return await dataAccess.products.findAll();
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw new Error('Failed to load products');
    }
  }

  async getById(id: string): Promise<SimpleProduct | null> {
    try {
      return await dataAccess.products.findById(id);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return null;
    }
  }

  async getByIds(ids: string[]): Promise<SimpleProduct[]> {
    try {
      return await dataAccess.products.findByIds(ids);
    } catch (error) {
      console.error('Failed to fetch products by IDs:', error);
      return [];
    }
  }

  // Get products with their brand information
  async getProductsWithBrands(): Promise<(SimpleProduct & { brand?: SimpleBrand })[]> {
    try {
      const [products, brands] = await Promise.all([
        this.getAll(),
        dataAccess.brands.findAll()
      ]);

      const brandMap = new Map(brands.map(b => [b.id, b]));

      return products.map(product => ({
        ...product,
        brand: brandMap.get(product.brand_id)
      }));
    } catch (error) {
      console.error('Failed to fetch products with brands:', error);
      return [];
    }
  }
}

// Brand Service
export class BrandService {
  async getAll(): Promise<SimpleBrand[]> {
    try {
      return await dataAccess.brands.findAll();
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      throw new Error('Failed to load brands');
    }
  }

  async getById(id: string): Promise<SimpleBrand | null> {
    try {
      return await dataAccess.brands.findById(id);
    } catch (error) {
      console.error('Failed to fetch brand:', error);
      return null;
    }
  }

  // Get brands with product counts
  async getBrandsWithProductCounts(): Promise<(SimpleBrand & { productCount: number })[]> {
    try {
      const [brands, products] = await Promise.all([
        this.getAll(),
        dataAccess.products.findAll()
      ]);

      // Count products per brand
      const productCounts = new Map<string, number>();
      products.forEach(product => {
        const count = productCounts.get(product.brand_id) || 0;
        productCounts.set(product.brand_id, count + 1);
      });

      return brands.map(brand => ({
        ...brand,
        productCount: productCounts.get(brand.id) || 0
      }));
    } catch (error) {
      console.error('Failed to fetch brands with product counts:', error);
      return [];
    }
  }
}

// Export service instances
export const representativeService = new RepresentativeService();
export const doctorService = new DoctorService();
export const productService = new ProductService();
export const brandService = new BrandService();

// Also export assignment service for convenience
export { assignmentService } from './assignment-service-simple';
