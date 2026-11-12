import api from './api.ts'

export const Category = {
  async getAllCategories() {
    const response = await api.get('/category')
    return response.data
  },

  async createCategory(data: { name: string; description?: string | null }) {
    const response = await api.post('/category', data)
    return response.data
  },

  // Nếu sau này cần thì bổ sung
  async updateCategory(id: number, data: any) {
    const response = await api.put(`/category/${id}/category`, data)
    return response.data
  },

  async deleteCategory(id: number) {
    const response = await api.delete(`/category/${id}`)
    return response.data
  },

  async deleteListCategory(ids: number[]) {
    const response = await api.delete('/category', { data: { Ids: ids } })
    return response.data
  },
  async uploadImage(id: number, file: File) {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post(`/category/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
