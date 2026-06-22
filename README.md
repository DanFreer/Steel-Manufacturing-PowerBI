# Steel Manufacturing Analytics | Power BI

Synthetic star-schema dataset and Power BI dashboard for a steel fabrication plant (plasma cutting, milling, bending, welding). Built to analyze production stability, quality defects, labor efficiency, and shipping performance.

![Executive Dashboard](screenshot/overview.png)

## Business Context

- **Industry:** Steel fabrication
- **Operations:** 1 day shift, Mon–Fri (255 production days in 2025)
- **Products:** Base plates (plasma cut), bearing housings (milled), frame channels (bent), bracket assemblies (welded)
- **Goal:** Track whether daily output stays stable and how quality issues affect shipping

## Data Model

Star schema with conformed dimensions:

| Type | Tables |
|------|--------|
| **Dimensions** | `DimDate`, `DimProduct`, `DimDepartment` |
| **Facts** | `FactProduction`, `FactQuality`, `FactLabor`, `FactShipping` |

**Relationships:** All facts → `DimDate`. Production & Quality → `DimProduct`. Labor → `DimDepartment`.

**Grain:**
- Production / Quality → Date × Product
- Labor → Date × Department
- Shipping → Date (plant level)

## Dashboard

| Page | Focus |
|------|--------|
| Executive Dashboard | Volume, defect rate, on-time %, labor hours |
| Operations Dashboard | Monthly output vs target, defect trends by product |
| Labor & Efficiency | Hours by department, units per labor hour |
| Shipping | On-time delivery and link to quality |

## Sample Insights

- Daily production holds within ~±8 units of target across all four products
- Defect spikes (~5% of days) reduce good output and correlate with lower on-time shipping
- Plasma cutting accounts for the highest labor hours; [your finding here]

## Getting Started

### 1. Regenerate data 

```bash
node generate_data.js
