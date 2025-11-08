import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import {
  SearchOutlined,
  MedicineBoxOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import "./LuaChonNhanhTimBacSi.scss";

export function LuaChonNhanhTimBacSi() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    if (location.trim()) {
      params.set("location", location.trim());
    }
    navigate(`/benh-nhan/tim-bac-si?${params.toString()}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="gradient-medical border-primary/20 fade-in doctor-search-card">
      <CardContent className="p-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <MedicineBoxOutlined
              style={{
                fontSize: "24px",
                color: "hsl(var(--primary))",
                marginTop: "40px",
              }}
            />
            <h3 className="text-xl font-semibold" style={{ marginTop: "40px" }}>
              Tìm bác sĩ và đặt lịch
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <SearchOutlined
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <Input
                placeholder="Tên bác sĩ hoặc chuyên khoa..."
                className="pl-10 bg-background h-12 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  height: "2.5rem",
                  fontSize: "1rem",
                  padding: "0.75rem 0.75rem 0.75rem 2.5rem",
                }}
              />
            </div>

            <div className="relative">
              <EnvironmentOutlined
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <Input
                placeholder="Vị trí..."
                className="pl-10 bg-background h-12 text-base"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  height: "2.5rem",
                  fontSize: "1rem",
                  padding: "0.75rem 0.75rem 0.75rem 2.5rem",
                }}
              />
            </div>

            <Button
              className="w-full medical-button h-12 text-base"
              onClick={handleSearch}
              style={{
                height: "2.5rem",
                fontSize: "1rem",
                padding: "0.75rem 1rem",
              }}
            >
              <SearchOutlined
                style={{ fontSize: "15px", marginRight: "8px" }}
              />
              Tìm kiếm
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
