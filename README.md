## 🌦️ Climsoft Web – Climate & Hydrology Data Management Platform

**Climsoft Web** is an open-source, next-generation **Climate & Hydrology Data Management Platform** that builds on the long-standing legacy of [Climsoft Version 4](https://github.com/climsoft) — widely used across Africa and other regions to manage observational climate data.
It re-imagines Climsoft for the web era, offering a modern, scalable, and collaborative environment for **collecting, processing, validating, storing, and sharing** climate and hydrological data. 

---

### 🌍 Purpose
Climsoft Web is designed to provide an integrated environment for National Meteorological and Hydrological Services (NMHSs), Regional Climate Centres (RCCs), Research Institutions, and development partners to manage observational data from diverse sources — including manual stations, automatic weather stations, and remote sensing systems — within a unified architecture to efficently ensure that environmental observations are **quality-controlled, well-structured, and readily accessible** to support **climate application services**.

---

### 🧩 Key Features

* **Data Ingestion & Integration:**
  Ingest data from web forms, CSV files, legacy databases, FTP/HTTP feeds, or automatic weather stations.

* **Quality Control Framework:**
  Implements modular QC tests — including range threshold, spike, flat-line, and consistency checks — with configurable parameters and automatic flagging.

* **Database Management:**
  Powered by **PostgreSQL** for primary storage and **DuckDB** for analytics acceleration; designed for long-term, high-volume time-series data.

* **User & Role Management:**
  Fine-grained access control for observers, validators, analysts, and administrators, aligned with institutional workflows.

* **Offline-First Web Interface:**
  Developed in **Angular (PWA)**, enabling data entry and validation even without internet access, with background synchronization when online.

* **API & Integration Layer:**
  Developed in **NestJS** and based on REST. It also includes **DuckDB** for rapid processing of huge datasets and implementations of HTTP, FTP, MQTT and gRPC for connecting to external systems such as WIS2Box.

* **Analytics & Visualization:**
  Interactive dashboards, statistical summaries, and geospatial visualizations (Leaflet/ECharts) for station networks, QC results, and environmental indicators.

---

### 🏗️ Technical Architecture

| Layer              | Technology           | Purpose                                                |
| ------------------ | -------------------- | ------------------------------------------------------ |
| **Frontend**       | Angular PWA          | User-friendly data entry, QC review, and visualization |
| **Backend**        | NestJS (Node.js)  + DuckDB       | Core API, QC processing, and automation services       |
| **Database**       | PostgreSQL + DuckDB  | Reliable storage + fast analytical queries             |
| **Deployment**     | Docker Compose       | Reproducible, portable, and scalable setup             |
| **Offline Engine** | Dexie.js / IndexedDB | Local caching and synchronization for PWA              |

---

### 🧠 Evolution from Climsoft Version 4

Climsoft Web extends the proven foundation of **Climsoft v4**, re-architected for modern infrastructures.
Once feature-parity is achieved, it will form the basis of **Climsoft v6**, with the web platform serving as the core system for data management across multiple NMHSs.
It maintains **full backward compatibility** with legacy Climsoft databases and supports seamless migration pathways.

---

### 🌱 Broader Vision

Beyond a data management plaform, Climsoft Web aims to evolve into a full **Climate & Hydrology Data Platform** that supports easy data access, regional integration, and AI-assisted analytics for transforming environmental data into actionable insights.
Its long-term goal is to empower countries to build resilient, data-driven services that underpin **climate adaptation**, **renewable-energy development**, and **high precision agriculture**.

---

### 🤝 Contributing

Climsoft Web is a community-driven open-source initiative.
We welcome contributions from developers, climate scientists, hydrologists, and institutions committed to strengthening environmental data systems across the globe.

### 📚 Source Code, Installation and Guides

This repository contains the source code distribution of the Climsoft Web.

Copyright and license information can be found in the file COPYRIGHT.

General documentation about this version of Climsoft Web can be found at [https://www.climsoft.org/docs/](https://docs.google.com/document/d/1VKiTcGnmF42iKSrzLFWt0UGz-JqOQ6lcTfW_Lm3ML0s/edit?usp=sharing) . In particular, information about building Climsoft Web from the source code can be found at [https://www.climsoft.org/docs/dev/installation.html](https://docs.google.com/document/d/1u_tL9bR9g6uIg7y96jPTykySiaJpVAwTX0YZhgCancU/edit?usp=sharing).

The latest version of this software, and related software, may be obtained at [https://www.climsoft.org/climsoft-web/releases/](https://github.com/climsoft/climsoft-web/releases). For more information look at our web site located at [https://www.climsoft.org](https://www.climsoft.org) .


