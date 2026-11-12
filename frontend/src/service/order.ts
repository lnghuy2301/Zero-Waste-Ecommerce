import api from './api.ts'

export const OrderService = {
  async confirmDemoPayment(id: number) {
    const response = await api.post(`/order/${id}/demo-payment`)
    return response.data
  },
  // 1. Tạo đơn hàng mới
  async createOrder(orderData: any) {
    const response = await api.post('/order', orderData)
    return response.data
  },

  // 2. Cập nhật trạng thái đơn hàng (Admin)
  async updateOrderStatus(id: number, status: string) {
    const response = await api.put(`/order/${id}/status`, { status })
    return response.data
  },

  // 3. Lấy danh sách đơn hàng của một người dùng
  async getOrdersByUser(accountId: number) {
    const response = await api.get(`/order/user/${accountId}`)
    return response.data
  },

  // 4. Lấy chi tiết một đơn hàng
  async getOrderById(id: number) {
    const response = await api.get(`/order/${id}`)
    return response.data
  },

  // 5. Hủy đơn hàng
  async cancelOrder(id: number) {
    const response = await api.delete(`/order/${id}`)
    return response.data
  },

  // 6. Xóa nhiều đơn hàng (Admin)
  async deleteListOrders(orderIds: number[]) {
    const response = await api.delete('/order', {
      data: { Ids: orderIds }, // sửa thành Ids cho khớp với DTO
    })
    return response.data
  },

  // === THÊM MỚI: Lấy tất cả đơn hàng cho Admin ===
  async getAllOrders() {
    const response = await api.get('/order') // bạn cần thêm endpoint này ở backend nếu chưa có
    return response.data
  },
}

export default OrderService
