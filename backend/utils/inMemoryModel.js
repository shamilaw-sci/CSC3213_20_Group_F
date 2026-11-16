/**
 * @file inMemoryModel.js
 * @description In-Memory Database Fallback Utility. Provides mock data stores and CRUD operations to keep the server operational during local development or unit testing without MongoDB Atlas.
 */

/**
 * In-Memory Model Fallback
 * Used when MongoDB is not available for testing/development
 * 
 * This provides a simple in-memory data store to keep the server functioning
 * even without MongoDB Atlas connection.
 */

class InMemoryDatabase {
    constructor() {
        this.collections = {
            users: [],
            courses: [],
            lessons: [],
            schedules: [],
            attendances: []
        };
        this.idCounters = {
            users: 1,
            courses: 1,
            lessons: 1,
            schedules: 1,
            attendances: 1
        };
    }

    /**
     * Generate unique ID
     */
    generateId(collection) {
        return `${collection}-${this.idCounters[collection]++}`;
    }

    /**
     * Insert document into collection
     */
    insert(collection, data) {
        if (!this.collections[collection]) {
            throw new Error(`Collection '${collection}' does not exist`);
        }
        const doc = {
            _id: this.generateId(collection),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.collections[collection].push(doc);
        return doc;
    }

    /**
     * Find all documents in collection
     */
    find(collection, filter = {}) {
        if (!this.collections[collection]) {
            throw new Error(`Collection '${collection}' does not exist`);
        }
        return this.collections[collection].filter(doc => {
            return Object.keys(filter).every(key => doc[key] === filter[key]);
        });
    }

    /**
     * Find single document
     */
    findOne(collection, filter = {}) {
        const results = this.find(collection, filter);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find by ID
     */
    findById(collection, id) {
        return this.findOne(collection, { _id: id });
    }

    /**
     * Update document
     */
    updateOne(collection, filter, update) {
        const doc = this.findOne(collection, filter);
        if (!doc) return null;
        
        const updated = {
            ...doc,
            ...update,
            updatedAt: new Date()
        };
        const index = this.collections[collection].indexOf(doc);
        this.collections[collection][index] = updated;
        return updated;
    }

    /**
     * Update many documents
     */
    updateMany(collection, filter, update) {
        const docs = this.find(collection, filter);
        return docs.map(doc => {
            const updated = {
                ...doc,
                ...update,
                updatedAt: new Date()
            };
            const index = this.collections[collection].indexOf(doc);
            this.collections[collection][index] = updated;
            return updated;
        });
    }

    /**
     * Delete document
     */
    deleteOne(collection, filter) {
        const doc = this.findOne(collection, filter);
        if (!doc) return null;
        
        const index = this.collections[collection].indexOf(doc);
        this.collections[collection].splice(index, 1);
        return doc;
    }

    /**
     * Delete many documents
     */
    deleteMany(collection, filter) {
        const docs = this.find(collection, filter);
        this.collections[collection] = this.collections[collection].filter(
            doc => !docs.includes(doc)
        );
        return docs;
    }

    /**
     * Count documents
     */
    countDocuments(collection, filter = {}) {
        return this.find(collection, filter).length;
    }

    /**
     * Clear all data
     */
    clear() {
        Object.keys(this.collections).forEach(key => {
            this.collections[key] = [];
        });
    }

    /**
     * Get collection stats
     */
    getStats() {
        return Object.keys(this.collections).reduce((stats, collection) => {
            stats[collection] = this.collections[collection].length;
            return stats;
        }, {});
    }
}

// Export singleton instance
module.exports = new InMemoryDatabase();
