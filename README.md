# Ban Wine Express (UrbanWineWeb)

Dự án hệ thống bán rượu trực tuyến với quy trình giao hàng và quản lý đơn hàng.

## Cấu trúc dự án

```text
ban-wine-express/
├── backend/
│   └── ban-wine-express/        # Mã nguồn Backend Spring Boot & API
│       ├── src/
│       ├── pom.xml
│       ├── mvnw / mvnw.cmd
│       └── ...
├── frontend/                    # Mã nguồn Frontend (Web / UI)
├── docs/                        # Tài liệu đặc tả, tài liệu thiết kế và hướng dẫn
├── .gitignore
├── .gitattributes
└── README.md
```

## Hướng dẫn chạy Backend

Vào thư mục backend:
```bash
cd backend/ban-wine-express
./mvnw clean spring-boot:run
```
