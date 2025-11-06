import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import "./ServicePriceManagement.scss";

export default function ServicePriceManagement() {
  const [servicePrices, setServicePrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    serviceName: "",
    price: "",
    isActive: true,
  });
  const [filterActive, setFilterActive] = useState("all"); // all, active, inactive
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadServicePrices();
  }, [filterActive, searchTerm, page]);

  useEffect(() => {
    // Load suggestions for autocomplete
    const loadSuggestions = async () => {
      if (searchTerm.trim().length > 0) {
        try {
          const response = await api.get(
            `/api/managers/service-prices?search=${encodeURIComponent(searchTerm.trim())}&limit=5`
          );
          if (response.success) {
            setSuggestions(response.data.servicePrices || []);
          }
        } catch (error) {
          console.error("Error loading suggestions:", error);
        }
      } else {
        setSuggestions([]);
      }
    };
    loadSuggestions();
  }, [searchTerm]);

  const loadServicePrices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActive !== "all") {
        params.append("isActive", filterActive === "active" ? "true" : "false");
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      params.append("page", page.toString());
      params.append("limit", "20");

      const response = await api.get(
        `/api/managers/service-prices?${params.toString()}`
      );

      if (response.success) {
        setServicePrices(response.data.servicePrices || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        alert("Không thể tải danh sách giá dịch vụ");
      }
    } catch (error) {
      console.error("Error loading service prices:", error);
      alert("Có lỗi xảy ra khi tải danh sách giá dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ serviceName: "", price: "" });
    setSelectedService(null);
    setShowAddDialog(true);
  };

  const handleEdit = (service) => {
    setFormData({
      serviceName: service.serviceName,
      price: service.price.toString(),
      isActive: !!service.isActive,
    });
    setSelectedService(service);
    setShowEditDialog(true);
  };

  const handleDelete = (service) => {
    setSelectedService(service);
    setShowDeleteDialog(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();

    if (!formData.serviceName.trim()) {
      alert("Vui lòng nhập tên dịch vụ");
      return;
    }

    if (!formData.price || isNaN(formData.price) || parseInt(formData.price) < 0) {
      alert("Vui lòng nhập giá hợp lệ (số nguyên dương)");
      return;
    }

    try {
      const response = await api.post("/api/managers/service-prices", {
        serviceName: formData.serviceName.trim(),
        price: parseInt(formData.price),
        // new services default to active; backend defaults true as well
      });

      if (response.success) {
        alert("Thêm dịch vụ thành công");
        setShowAddDialog(false);
        loadServicePrices();
      } else {
        alert(response.message || "Không thể thêm dịch vụ");
      }
    } catch (error) {
      console.error("Error adding service price:", error);
      let errorMessage = "Có lỗi xảy ra khi thêm dịch vụ";
      
      // Try to extract message from error
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Check if error.message is a JSON string
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else {
            errorMessage = error.message;
          }
        } catch {
          // Not JSON, use error.message directly
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (!formData.serviceName.trim()) {
      alert("Vui lòng nhập tên dịch vụ");
      return;
    }

    if (!formData.price || isNaN(formData.price) || parseInt(formData.price) < 0) {
      alert("Vui lòng nhập giá hợp lệ (số nguyên dương)");
      return;
    }

    try {
      const response = await api.put(
        `/api/managers/service-prices/${selectedService._id}`,
        {
          serviceName: formData.serviceName.trim(),
          price: parseInt(formData.price),
          isActive: formData.isActive,
        }
      );

      if (response.success) {
        alert("Cập nhật dịch vụ thành công");
        setShowEditDialog(false);
        setSelectedService(null);
        loadServicePrices();
      } else {
        alert(response.message || "Không thể cập nhật dịch vụ");
      }
    } catch (error) {
      console.error("Error updating service price:", error);
      let errorMessage = "Có lỗi xảy ra khi cập nhật dịch vụ";
      
      // Try to extract message from error
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Check if error.message is a JSON string
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else {
            errorMessage = error.message;
          }
        } catch {
          // Not JSON, use error.message directly
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await api.delete(
        `/api/managers/service-prices/${selectedService._id}`
      );

      if (response.success) {
        alert("Xóa dịch vụ thành công");
        setShowDeleteDialog(false);
        setSelectedService(null);
        loadServicePrices();
      } else {
        alert(response.message || "Không thể xóa dịch vụ");
      }
    } catch (error) {
      console.error("Error deleting service price:", error);
      let errorMessage = "Có lỗi xảy ra khi xóa dịch vụ";
      
      // Try to extract message from error
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Check if error.message is a JSON string
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else {
            errorMessage = error.message;
          }
        } catch {
          // Not JSON, use error.message directly
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleToggleStatus = async (service) => {
    try {
      const response = await api.put(
        `/api/managers/service-prices/${service._id}`,
        {
          isActive: !service.isActive,
        }
      );

      if (response.success) {
        alert(
          service.isActive
            ? "Đã tắt dịch vụ thành công"
            : "Đã bật dịch vụ thành công"
        );
        loadServicePrices();
      } else {
        alert(response.message || "Không thể cập nhật trạng thái");
      }
    } catch (error) {
      console.error("Error toggling service status:", error);
      alert("Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  return (
    <div className="service-price-management">
      <div className="service-price-management-header">
        <div className="header-left">
          <h1>
            <span className="icon">💰</span>
            Quản lý giá dịch vụ
          </h1>
        </div>
        <div className="header-right">
          <Button onClick={handleAdd} className="btn-add">
            <Plus className="icon" />
            Thêm dịch vụ
          </Button>
        </div>
      </div>

      <div className="service-price-management-filters">
        <div className="filters-card">
          <div className="filters-row">
            <div className="search-input-group">
              <Search className="search-icon" />
              <Input
                type="text"
                placeholder="Tìm kiếm dịch vụ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <Button
                variant={filterActive === "all" ? "primary" : "outline"}
                onClick={() => {
                  setFilterActive("all");
                  setPage(1);
                }}
              >
                Tất cả
              </Button>
              <Button
                variant={filterActive === "active" ? "primary" : "outline"}
                onClick={() => {
                  setFilterActive("active");
                  setPage(1);
                }}
              >
                Đang hoạt động
              </Button>
              <Button
                variant={filterActive === "inactive" ? "primary" : "outline"}
                onClick={() => {
                  setFilterActive("inactive");
                  setPage(1);
                }}
              >
                Đã tắt
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : servicePrices.length === 0 ? (
        <div className="empty-state">
          Chưa có dịch vụ nào. Hãy thêm dịch vụ mới.
        </div>
      ) : (
        <div className="service-price-management-table-scroll">
          <div className="service-price-management-table">
            <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên dịch vụ</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {servicePrices.map((service, index) => (
                <tr key={service._id}>
                  <td>{(page - 1) * 20 + index + 1}</td>
                  <td>{service.serviceName}</td>
                  <td>{formatPrice(service.price)}</td>
                  <td>
                    <div className="status-cell">
                      <button
                        className={`status-toggle ${service.isActive ? "active" : "inactive"}`}
                        onClick={() => handleToggleStatus(service)}
                        title={service.isActive ? "Click để tắt" : "Click để bật"}
                      >
                        {service.isActive ? (
                          <ToggleRight className="icon" />
                        ) : (
                          <ToggleLeft className="icon" />
                        )}
                        <span className="status-text">
                          {service.isActive ? "Đang hoạt động" : "Đã tắt"}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit className="icon" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(service)}
                        className="btn-delete"
                      >
                        <Trash2 className="icon" />
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {servicePrices.length === 0 && (
            <div className="empty-state" style={{ padding: 16 }}>
              Không tìm thấy dịch vụ phù hợp.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm dịch vụ mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
            <div className="form-group">
              <label>Tên dịch vụ *</label>
              <Input
                value={formData.serviceName}
                onChange={(e) =>
                  setFormData({ ...formData, serviceName: e.target.value })
                }
                placeholder="Nhập tên dịch vụ"
                required
              />
            </div>
            <div className="form-group">
              <label>Giá (VND) *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="Nhập giá dịch vụ"
                min="0"
                required
              />
            </div>
            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Hủy
              </Button>
              <Button type="submit">Thêm</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa dịch vụ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="form-group">
              <label>Tên dịch vụ *</label>
              <Input
                value={formData.serviceName}
                onChange={(e) =>
                  setFormData({ ...formData, serviceName: e.target.value })
                }
                placeholder="Nhập tên dịch vụ"
                required
              />
            </div>
            <div className="form-group">
              <label>Giá (VND) *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="Nhập giá dịch vụ"
                min="0"
                required
              />
            </div>
            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedService(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit">Cập nhật</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p>
            Bạn có chắc chắn muốn xóa dịch vụ "{selectedService?.serviceName}"?
          </p>
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedService(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="btn-delete"
            >
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
