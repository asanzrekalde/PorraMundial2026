from __future__ import annotations

import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from pypdf import PdfReader


PDF_URL = (
    "https://digitalhub.fifa.com/m/636f5c9c6f29771f/"
    "original/FWC2026_regulations_EN.pdf"
)

WINNER_SLOTS = (
    "1A",
    "1B",
    "1D",
    "1E",
    "1G",
    "1I",
    "1K",
    "1L",
)

# Validación adicional basada en los cruces oficiales de dieciseisavos.
ALLOWED_GROUPS = {
    "1A": set("CEFHI"),
    "1B": set("EFGIJ"),
    "1D": set("BEFIJ"),
    "1E": set("ABCDF"),
    "1G": set("AEHIJ"),
    "1I": set("CDFGH"),
    "1K": set("DEIJL"),
    "1L": set("EHIJK"),
}

# Cada fila del Anexo C tiene:
# opción + ocho terceros asignados a 1A, 1B, 1D, 1E, 1G, 1I, 1K y 1L.
#
# Ejemplo:
# 1 3E 3J 3I 3F 3H 3G 3L 3K
ROW_PATTERN = re.compile(
    r"(?m)^\s*(\d{1,3})\s+((?:3[A-L]\s*){8})"
)


def load_pdf_bytes() -> bytes:
    """
    Descarga el reglamento oficial o lee un PDF local indicado como argumento.

    Uso alternativo:
        py tools/generate-third-place-map.py ruta/al/pdf.pdf
    """
    if len(sys.argv) > 1:
        local_path = Path(sys.argv[1]).expanduser().resolve()

        if not local_path.exists():
            raise FileNotFoundError(f"No existe el PDF local: {local_path}")

        print(f"Leyendo PDF local: {local_path}")
        return local_path.read_bytes()

    print("Descargando reglamento oficial de FIFA...")

    request = urllib.request.Request(
        PDF_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36"
            )
        },
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))

    return "\n".join(
        page.extract_text() or ""
        for page in reader.pages
    )


def parse_official_assignments(text: str) -> dict[str, dict[str, str]]:
    options: dict[int, list[str]] = {}

    for match in ROW_PATTERN.finditer(text):
        option_number = int(match.group(1))

        if option_number < 1 or option_number > 495:
            continue

        groups = re.findall(r"3([A-L])", match.group(2))

        if len(groups) != 8:
            continue

        options[option_number] = groups

    expected_options = set(range(1, 496))
    found_options = set(options)
    missing_options = sorted(expected_options - found_options)

    if missing_options:
        preview = ", ".join(map(str, missing_options[:20]))

        raise RuntimeError(
            "No se pudieron extraer las 495 opciones del PDF. "
            f"Faltan opciones: {preview}"
        )

    scenarios: dict[str, dict[str, str]] = {}

    for option_number in range(1, 496):
        groups = options[option_number]

        if len(set(groups)) != 8:
            raise RuntimeError(
                f"La opción {option_number} no contiene ocho grupos únicos: "
                f"{groups}"
            )

        assignment = dict(zip(WINNER_SLOTS, groups))

        for winner_slot, third_group in assignment.items():
            if third_group not in ALLOWED_GROUPS[winner_slot]:
                raise RuntimeError(
                    f"Opción oficial inválida al validar {option_number}: "
                    f"{winner_slot} no puede recibir 3{third_group}"
                )

        combination_key = "-".join(sorted(groups))

        if combination_key in scenarios:
            raise RuntimeError(
                f"Combinación duplicada detectada: {combination_key}"
            )

        scenarios[combination_key] = assignment

    if len(scenarios) != 495:
        raise RuntimeError(
            f"Se esperaban 495 combinaciones y se obtuvieron {len(scenarios)}"
        )

    return scenarios


def generate_javascript(
    scenarios: dict[str, dict[str, str]]
) -> str:
    serialized = json.dumps(
        scenarios,
        ensure_ascii=True,
        indent=2,
        sort_keys=True,
    )

    return f"""// Archivo generado automáticamente.
// Fuente: Reglamento oficial FIFA World Cup 26, Anexo C.
// No editar manualmente.
//
// Regenerar con:
//   py tools/generate-third-place-map.py

export const THIRD_PLACE_WINNER_SLOTS = Object.freeze([
  "1A",
  "1B",
  "1D",
  "1E",
  "1G",
  "1I",
  "1K",
  "1L",
]);

export const THIRD_PLACE_ASSIGNMENTS = Object.freeze({serialized});

export function buildThirdCombinationKey(groups) {{
  if (!Array.isArray(groups)) return null;

  const uniqueGroups = [...new Set(groups)].sort();

  if (uniqueGroups.length !== 8) return null;

  return uniqueGroups.join("-");
}}

export function getThirdPlaceAssignment(groups) {{
  const key = buildThirdCombinationKey(groups);

  if (!key) return null;

  return THIRD_PLACE_ASSIGNMENTS[key] ?? null;
}}
"""


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    output_path = project_root / "js" / "third-place-map.js"

    pdf_bytes = load_pdf_bytes()
    text = extract_text(pdf_bytes)
    scenarios = parse_official_assignments(text)
    javascript = generate_javascript(scenarios)

    output_path.write_text(javascript, encoding="utf-8")

    print()
    print("OK")
    print(f"Archivo generado: {output_path}")
    print(f"Combinaciones validadas: {len(scenarios)}")


if __name__ == "__main__":
    main()