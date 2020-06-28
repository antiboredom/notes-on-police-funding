import re
import json
import pygments
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.formatters import HtmlFormatter
import mistune


def markdown(text):
    return mistune.markdown(text)


def highlight(code):
    lexer = get_lexer_by_name("python", stripall=False)
    formatter = HtmlFormatter()
    return pygments.highlight(code, lexer, formatter)


if __name__ == "__main__":
    output = []

    cells = json.load(open("notes.ipynb", "r"))["cells"]
    for c in cells:
        if c["cell_type"] == "markdown":
            source = "".join(c["source"])
            html = mistune.markdown(source).strip()
            if re.search("^##[^#]", source):
                section = {"title": html, "items": []}
                output.append(section)
            else:
                output[-1]["items"].append({"html": html})
        elif c["cell_type"] == "code":
            if len(c["outputs"]) == 0:
                continue
            source = "".join(c["source"])
            output[-1]["items"][-1]["code"] = highlight(source)
            # output[-1]["items"][-1]["code"] = source
            for o in c["outputs"]:
                data = o.get("data")
                if data is None:
                    continue

                metadata = o.get("metadata", {}).get("application/json", {})
                output[-1]["items"][-1]["metadata"] = metadata

                jsondata = data.get("application/json")
                if jsondata:
                    output[-1]["items"][-1]["data"] = jsondata

                svgdata = data.get("image/svg+xml")
                if svgdata:
                    # output[-1]["items"][-1]["svg"] = "".join(svgdata)
                    output[-1]["items"][-1]["chart"] = True


    with open("notes.json", "w") as outfile:
        json.dump(output, outfile)
