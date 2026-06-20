import os

# Configuration
JS_FILES = [
    "src/model.js",
    "src/reader.js",
    "src/exporter.js",
    "src/parser.js",
    "src/parser_furnace.js",
    "src/audio.js",
    "src/main.js"
]
TEMPLATE_PATH = "src/template.html"
OUTPUT_PATH = "hutrack_export.html"
PLACEHOLDER = "<!-- JS_INJECTION_POINT -->"

def build():
    try:
        # Concatenate JS files
        js_content = []
        for file_path in JS_FILES:
            with open(file_path, 'r', encoding='utf-8') as f:
                js_content.append(f.read())
        
        full_js = "\n".join(js_content)

        # Inject into template
        with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            html_template = f.read()

        final_html = html_template.replace(PLACEHOLDER, full_js)

        # Write output
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            f.write(final_html)

        print(f"Successfully generated {OUTPUT_PATH}")

    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    build()
