# Guía de desarrollo

Aplicable a proyectos React, Next.js y TypeScript. Adapta las reglas al stack existente. Antes de cambiar convenciones, revisa el código cercano.

## Principios

- Haz cambios pequeños, completos y coherentes con la arquitectura.
- Reutiliza componentes, hooks, helpers, tipos y tokens existentes.
- No hagas refactors ni cambios ajenos al pedido. Conserva el comportamiento actual.
- No ocultes errores ni agregues dependencias innecesarias.
- Respeta la estructura existente; no muevas archivos ni agregues capas sin necesidad.

## Stack y estructura

Next.js App Router, React, TypeScript estricto, CSS Modules, PostCSS, ESLint y Prettier.

- `app/`: rutas, layouts, páginas y estilos globales.
- `components/Nombre/`: `index.tsx` y `Nombre.module.css`.
- `components/index.tsx`: barrel de componentes.
- `hooks/`: hooks en kebab-case.
- `lib/`: helpers, configuración y constantes.
- `types/`: tipos compartidos.
- `public/`: recursos estáticos.

**Importante:** esta versión de Next.js puede tener APIs y convenciones incompatibles con versiones anteriores. Antes de escribir código, consulta la documentación pertinente en `node_modules/next/dist/docs/`, resolviendo la ubicación correcta en monorepos.

## TypeScript y React

- Usa TypeScript estricto; evita `any`, usa `unknown` con narrowing.
- Componentes funcionales con arrow functions y props desestructuradas. Evita `React.FC` en código nuevo.
- Usa `interface` para contratos extensibles y `type` para uniones, aliases y composiciones.
- Usa `import type` cuando corresponda y tipos compartidos en `types/`.
- No agregues `'use client'` preventivamente: limita su uso a los componentes que necesiten estado, efectos, eventos o APIs de cliente.
- No accedas a APIs del navegador durante el render del servidor.
- Usa keys estables, nombres descriptivos y actualizaciones funcionales de estado cuando corresponda.
- Calcula valores derivados durante el render, sin duplicarlos en estado.
- Mantén APIs de componentes pequeñas, explícitas y correctamente tipadas.

## Imports y formato

- Usa `@/` para imports internos entre áreas y rutas relativas para archivos cercanos.
- Orden: React/Next, externos, alias internos, relativos y estilos. Evita duplicados.
- Componentes y tipos: PascalCase; variables, funciones y hooks: camelCase; hooks con prefijo `use`.
- Archivos de componentes: carpetas PascalCase, `index.tsx` y `Nombre.module.css`. Hooks y utilidades: kebab-case.
- Prettier: 2 espacios, sin tabs, punto y coma, comillas simples, ancho 100, sin trailing comma, `bracketSameLine` y finales de línea automáticos.
- Ejecuta el formatter configurado; no asumas que Prettier aplica todas las reglas de ESLint.

## CSS y accesibilidad

- Usa CSS Modules; reserva `app/globals.css` para reset, tipografía, variables y estilos globales.
- Sigue BEM: bloque y elementos como `container`, `container__title`; conserva los modificadores existentes.
- Usa anidación PostCSS con `&`, poco profunda, evitando filtraciones globales.
- Accede a clases mediante `s.clase`. Para clases condicionales, importa `classnames` como `cs` y usa mapas de modificadores booleanos.
- Prefiere variables y custom media existentes (`--small`, `--medium`, `--large`, `--retina`). Mantén el responsive junto al componente.
- No mezcles Tailwind en componentes existentes ni uses `cn` en lugar de `cs` sin justificación.
- Evita `!important`, estilos inline y transiciones globales, salvo necesidad técnica.
- Usa HTML semántico, botones para acciones y enlaces para navegación. Añade labels y `aria-label` a controles de icono, `alt` adecuado y foco visible.
- En enlaces con `target="_blank"`, usa `rel="noopener noreferrer"`.

## Hooks y animaciones

- Extrae hooks cuando encapsulen lógica reutilizable, no para mover unas pocas líneas.
- Mantén dependencias de efectos correctas y limpia listeners, timers, observers y suscripciones.
- Maneja carga, error y resultado en operaciones asíncronas; evita promesas rechazadas sin tratar y respuestas obsoletas.
- Usa Framer Motion o GSAP para una buena estetica.
- Evita animar propiedades costosas si existe una alternativa con `transform` u `opacity`. Respeta `prefers-reduced-motion`.
- No dupliques animaciones CSS y Framer Motion sobre la misma propiedad.

## Datos y seguridad

- Separa configuración y datos compartidos cuando tenga sentido; prefiere helpers puros.
- Valida y codifica datos de URLs, formularios, APIs y almacenamiento según su contexto.
- No uses `dangerouslySetInnerHTML` con contenido sin sanitización confiable.
- Nunca expongas secretos, tokens ni datos sensibles en el cliente o en logs. Las variables `NEXT_PUBLIC_` son públicas.
- Valida URLs externas y conserva las protecciones del navegador.

## Firebase: plan Spark

- Prioriza el nivel gratuito y minimiza lecturas, escrituras y operaciones innecesarias.
- Usa únicamente los SDK y servicios necesarios. Evita listeners en tiempo real si no son imprescindibles.
- Configura reglas de seguridad correctas; nunca abras acceso general para solucionar errores de permisos.
- No confundas la configuración pública del SDK con credenciales privadas. No incluyas claves privadas ni secretos en el cliente.
- No inicialices Analytics ni otros servicios si no se utilizan o si no son compatibles con el entorno.

## Validación

Usa Yarn (`yarn.lock`); no uses npm ni generes `package-lock.json`.

- `yarn lint`: lint y reglas configuradas.
- `yarn build`: compilación de producción.
- `yarn dev`: desarrollo local.
- No hay tests unitarios configurados por defecto. Si se agregan, prueba la lógica relevante.
- Al terminar, revisa el diff y elimina cambios temporales, generados o ajenos al pedido.

El bloque de reglas de Next.js delimitado por `BEGIN:nextjs-agent-rules` y `END:nextjs-agent-rules` puede ser regenerado por `next dev`. No lo elimines del diff sin comprobar su origen.

## Tarea actual:

-Lograr que se puedan crear salas donde alguien la crea y se genera un link donde los amigos podran entrar a cargar sus gastos. cada uno tendra su nombre.
