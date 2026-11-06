<div align="center">

# 📦 Portal de Encomiendas Lapticon

**Portal web para que los viajeros de Lapticon registren y gestionen encomiendas entre ciudades.**

Hecho con **HTML, CSS y JavaScript puro**, sin frameworks ni librerías.

[![Demo en vivo](https://img.shields.io/badge/🚀_Demo_en_vivo-GitHub_Pages-1d4ed8?style=for-the-badge)](https://ketsa143.github.io/lapticon-portal/)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=black)

🔗 **https://ketsa143.github.io/lapticon-portal/**

</div>

---

## 🧭 Contexto

**Lapticon** conecta a viajeros con personas que necesitan enviar encomiendas entre ciudades. Este portal consume directamente el backend de Lapticon en producción, así que basta con un navegador para usarlo: no hay que instalar Node.js ni MongoDB.

## ✨ Funcionalidades

| # | Bloque | Qué hace |
|---|--------|----------|
| 1 | 🔐 **Login** | Inicia sesión con Firebase Authentication y guarda `idToken` y `uid` para las llamadas protegidas |
| 2 | 🌎 **Catálogo de ciudades** | Llena los selects de **origen** y **destino** desde la API (países + ciudades) |
| 3 | 📝 **Registrar encomienda** | Formulario con origen, destino, valor, moneda y observaciones, validado en el cliente |
| 4 | 📋 **Mis encomiendas** | Tabla con origen, destino, estado y valor; se refresca sola después de crear una encomienda |
| 5 | ❌ **Cancelar** *(reto opcional)* | Botón por fila que cambia el estado a `cancelada` y actualiza la fila sin recargar |

### 💡 Detalles de experiencia de usuario
- ⏳ **Estados de carga visibles** en cada sección (incluye aviso de que el servidor gratuito puede tardar en despertar)
- 🚨 **Mensajes de error claros**, traducidos a español cuando vienen de Firebase y tomados de la respuesta del API en los demás casos
- ✅ **Validaciones:** ningún campo vacío, origen distinto de destino y valor numérico mayor que 0
- 🏷️ **Badges de color** según el estado de la encomienda
- 🔒 Los botones se deshabilitan mientras se procesa una petición, para evitar dobles envíos
- 🚪 Botón de **cerrar sesión**

## 🔌 Endpoints consumidos

| Método | Endpoint | Auth |
|:------:|----------|:----:|
| `POST` | `identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` | — |
| `GET`  | `/api/ciudades/paises` | — |
| `GET`  | `/api/ciudades/ciudades` | — |
| `POST` | `/api/encomiendas` | 🔑 Bearer |
| `GET`  | `/api/encomiendas` | 🔑 Bearer |
| `PUT`  | `/api/encomiendas/:id/estado` | 🔑 Bearer |

**Base URL:** `https://lapticon-backend.onrender.com`  ·  **Docs:** [Swagger](https://lapticon-backend.onrender.com/api-docs/)

## 🗂️ Estructura

```
lapticon-portal/
├── index.html   → Estructura: login, catálogo, formulario y tabla
├── script.js    → Lógica: fetch a la API, validaciones, render del DOM
├── style.css    → Estilos: tarjetas, estados y badges
└── README.md
```

## 🚀 Cómo ejecutarlo

### Opción 1: Online
Abre 👉 **[ketsa143.github.io/lapticon-portal](https://ketsa143.github.io/lapticon-portal/)**

### Opción 2: Local
> ⚠️ No abras el `index.html` con doble clic: el navegador envía origen `null` y el backend bloquea la petición por CORS.

```bash
git clone https://github.com/Ketsa143/lapticon-portal.git
cd lapticon-portal
npx serve          # o: python -m http.server 5500
```
También funciona con la extensión **Live Server** de VS Code (clic derecho en `index.html` → *Open with Live Server*).

### 🧪 Usuario de pruebas
```
Correo:     test30@gmail.com
Contraseña: 1234567
```

## 🔄 Flujo

```
Login ──► Cargar ciudades ──► Elegir origen/destino ──► Crear encomienda ──► Tabla actualizada ──► Cancelar
```

---

<div align="center">

Hecho por **Keppler Sánchez** · [@Ketsa143](https://github.com/Ketsa143)

</div>
