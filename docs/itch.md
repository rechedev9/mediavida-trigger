# Página de itch.io

Todo lo necesario para publicar el juego en [itch.io](https://itch.io). La portada y las capturas están en [`docs/itch/`](itch/).

## 1. Cuenta

Regístrate en https://itch.io/register. Después crea el proyecto en https://itch.io/game/new.

## 2. Datos del proyecto

| Campo                        | Valor                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Title                        | Mediavida Trigger                                                                           |
| Project URL                  | `mediavida-trigger`                                                                         |
| Short description or tagline | RPG de 16 bits en el foro Mediavida. Viaja por sus eras y salva los hilos.                  |
| Classification               | Games                                                                                       |
| Kind of project              | HTML                                                                                        |
| Release status               | Released                                                                                    |
| Pricing                      | No payments                                                                                 |
| Uploads                      | `release/mediavida-trigger-web.zip`, marcado como "This file will be played in the browser" |
| Genre                        | Role Playing                                                                                |
| Tags                         | rpg, jrpg, pixel-art, 16-bit, retro, time-travel, fan-game, singleplayer, spanish, atb      |
| Cover image                  | `docs/itch/cover.png`                                                                       |
| Screenshots                  | `docs/itch/screen-1.png` a `screen-6.png`                                                   |
| Languages                    | Spanish                                                                                     |
| Inputs                       | Keyboard, Gamepad (any)                                                                     |
| Visibility                   | Draft hasta probarlo, luego Public                                                          |

## 3. Opciones del embed

| Opción                           | Valor                              |
| -------------------------------- | ---------------------------------- |
| Embed options                    | Embed in page                      |
| Viewport dimensions              | 768 x 672 (escala 3x exacta)       |
| Mobile friendly                  | Desactivado (solo teclado y mando) |
| Automatically start on page load | Desactivado                        |
| Fullscreen button                | Activado                           |
| Enable scrollbars                | Desactivado                        |
| SharedArrayBuffer support        | Desactivado                        |

## 4. Descripción

Pega este texto en el campo Description:

```text
Un hilo necroposteado abre un portal. Toca salvar el foro a través del tiempo.

Mediavida Trigger es un RPG al estilo de los clásicos de 16 bits, ambientado en el foro Mediavida. Novato acaba de registrarse con el rango "Inocente" cuando un portal lo lanza al pasado. En 2036 una IA llamada Lagvos ha llenado el foro de bots, y todo empezó con un bug de 2005.

QUÉ HAY
- Cuatro eras del foro: la Plaza del Pueblo en 2026, la Era de los Clanes en 2005, la Edad de Oro del OFF-Topic en 2011 y un 2036 lleno de bots.
- Combate ATB sobre el mapa, con modo Espera o Activo.
- 41 técnicas, incluidas técnicas dobles y triples.
- Siete foreros en el grupo, cada uno con sus propias técnicas.
- Música sintetizada y arte original hecho con Aseprite.

CONTROLES
Flechas o WASD: moverse
Z, Enter o Espacio: confirmar
X, Esc o Retroceso: cancelar
C o Tab: menú
Shift: correr. Mantenlo en combate para huir.
También funciona con mando.

La partida se guarda en el navegador.

AVISO
Juego de fans sin ánimo de lucro. No está afiliado a Mediavida ni a Square Enix, y no usa ningún asset de Chrono Trigger. Los foreros salen con su nick público y en tono de homenaje. Si eres uno de ellos y prefieres no salir, déjalo en los comentarios.

Código: https://github.com/rechedev9/mediavida-trigger
```

## 5. Divulgación de IA

itch.io pregunta si el proyecto contiene contenido generado con IA. El código, el arte, los textos y la música se hicieron con ayuda de Claude, así que la respuesta honesta es que sí.

## 6. Regenerar el zip

El zip lleva `index.html` en la raíz, que es lo que pide itch. En PowerShell, el `tar` de Windows crea el zip con rutas `/`:

```powershell
bun run build
New-Item -ItemType Directory -Force release
tar -a -cf release/mediavida-trigger-web.zip -C dist *
```
