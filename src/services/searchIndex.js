class SearchIndex {
  constructor() {
    this.documents = [];
  }

  // Load documents precomputed by the Spark pipeline
  loadIndex(docs) {
    this.documents = docs;
  }

  // Retrieve all indexed documents
  getAll() {
    return this.documents;
  }

  // Retrieve single document by ID
  getDocument(id) {
    return this.documents.find(doc => doc.id === id) || null;
  }

  // Retrieve documents filtered by category
  getDocsByCategory(category) {
    if (!category || category === "All") {
      return this.documents;
    }
    return this.documents.filter(doc => doc.category === category);
  }

  // Get index stats
  getStats() {
    return {
      documentCount: this.documents.length,
      suspiciousCount: this.documents.filter(d => d.isSuspicious).length
    };
  }
}

export const searchIndex = new SearchIndex();
export default searchIndex;
