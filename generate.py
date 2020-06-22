import json
from jinja2 import Environment
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


env = Environment()

env.filters["markdown"] = markdown
env.filters["highlight"] = highlight

template = env.from_string(open("template.html").read())

cells = json.load(open("notes.ipynb", "r"))["cells"]

rendered = template.render(cells=cells)

open("index.html", "w").write(rendered)

# import json
# from jinja2 import Template
# import mistune
#
# cells = json.load(open("Exploration.ipynb", "r"))["cells"]
#
# for c in cells:
#     cell_type = c["cell_type"]
#     print(cell_type)
#
#
# t = Template(open("template.html").read())
#
# rendered = t.render(cells=cells)
#
# print(rendered)
