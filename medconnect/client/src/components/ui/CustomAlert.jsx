import PropTypes from "prop-types";
import { Plus } from "lucide-react";
import "./CustomAlert.scss";

export const CustomAlert = ({ 
  message, 
  onClose, 
  onConfirm,
  title = "Hệ thống MedConnect",
  type = "alert" // "alert" or "confirm"
}) => {
  if (!message) return null;

  const isConfirm = type === "confirm" && onConfirm;

  return (
    <div className="custom-alert-overlay" onClick={isConfirm ? undefined : onClose}>
      <div className="custom-alert-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="custom-alert-header">
          <div className="custom-alert-title-wrapper">
            <div className="custom-alert-logo-icon">
              <Plus className="custom-alert-logo-plus" />
            </div>
            <h3 className="custom-alert-title">{title}</h3>
          </div>
        </div>
        <div className="custom-alert-body">
          <p className="custom-alert-message">{message}</p>
        </div>
        <div className="custom-alert-footer">
          {isConfirm ? (
            <>
              <button className="custom-alert-button cancel" onClick={onClose}>
                Hủy
              </button>
              <button className="custom-alert-button confirm" onClick={onConfirm}>
                Xác nhận
              </button>
            </>
          ) : (
            <button className="custom-alert-button" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

CustomAlert.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
  type: PropTypes.oneOf(["alert", "confirm"]),
};

