"""Tiny writer for Godot 4 .tscn files (text scenes).

Used by the level kit (kit.py). Produces normal scenes Colin can open and edit
in the Godot editor. Values: V(x, y) -> Vector2, C(r,g,b,a) -> Color,
Ext(id) / Sub(id) references, NodePath("..") paths, Raw("...") verbatim.
"""


class V:
    def __init__(self, x, y):
        self.x, self.y = float(x), float(y)

    def __str__(self):
        return f"Vector2({_num(self.x)}, {_num(self.y)})"


class C:
    def __init__(self, r, g, b, a=1.0):
        self.v = (r, g, b, a)

    def __str__(self):
        return "Color(%s)" % ", ".join(_num(x) for x in self.v)


class Raw:
    def __init__(self, s):
        self.s = s

    def __str__(self):
        return self.s


class NodePath:
    def __init__(self, p):
        self.p = p

    def __str__(self):
        return f'NodePath("{self.p}")'


class Ref:
    def __init__(self, kind, rid):
        self.kind, self.rid = kind, rid

    def __str__(self):
        return f'{self.kind}("{self.rid}")'


def _num(x):
    if float(x).is_integer():
        return str(int(x))
    return repr(round(float(x), 4))


def value(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return _num(v)
    if isinstance(v, str):
        return '"' + v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    if isinstance(v, (list, tuple)):
        if v and all(isinstance(x, V) for x in v):
            return "PackedVector2Array(%s)" % ", ".join(f"{_num(p.x)}, {_num(p.y)}" for p in v)
        if v and all(isinstance(x, NodePath) for x in v):
            return "Array[NodePath]([%s])" % ", ".join(str(x) for x in v)
        return "[%s]" % ", ".join(value(x) for x in v)
    return str(v)


class Scene:
    def __init__(self, root_name, root_type="Node2D"):
        self.ext = []        # (type, path, id)
        self.subs = []       # (type, id, props)
        self.nodes = []      # (name, type, parent, props, instance)
        self.root_name = root_name
        self.root_type = root_type
        self.root_props = {}
        self._names = {}

    def ext_res(self, rtype, path):
        for t, p, i in self.ext:
            if p == path:
                return Ref("ExtResource", i)
        rid = str(len(self.ext) + 1)
        self.ext.append((rtype, path, rid))
        return Ref("ExtResource", rid)

    def script(self, path):
        return self.ext_res("Script", path)

    def scene(self, path):
        return self.ext_res("PackedScene", path)

    def resource(self, path):
        return self.ext_res("Resource", path)

    def sub_res(self, rtype, props):
        rid = f"{rtype}_{len(self.subs) + 1}"
        self.subs.append((rtype, rid, props))
        return Ref("SubResource", rid)

    def unique(self, parent, base):
        key = (parent, base)
        n = self._names.get(key, 0) + 1
        self._names[key] = n
        return f"{base}{n}"

    def node(self, name, ntype=None, parent=".", props=None, instance=None, unique=True):
        if unique:
            name = self.unique(parent, name)
        self.nodes.append((name, ntype, parent, dict(props or {}), instance))
        return name if parent == "." else f"{parent}/{name}"

    def save(self, path):
        out = [f"[gd_scene load_steps={len(self.ext) + len(self.subs) + 1} format=3]", ""]
        for t, p, i in self.ext:
            out.append(f'[ext_resource type="{t}" path="{p}" id="{i}"]')
        if self.ext:
            out.append("")
        for t, i, props in self.subs:
            out.append(f'[sub_resource type="{t}" id="{i}"]')
            for k, v in props.items():
                out.append(f"{k} = {value(v)}")
            out.append("")
        out.append(f'[node name="{self.root_name}" type="{self.root_type}"]')
        for k, v in self.root_props.items():
            out.append(f"{k} = {value(v)}")
        out.append("")
        for name, ntype, parent, props, instance in self.nodes:
            head = f'[node name="{name}"'
            if ntype and not instance:
                head += f' type="{ntype}"'
            head += f' parent="{parent}"'
            if instance:
                head += f" instance={instance}"
            out.append(head + "]")
            for k, v in props.items():
                if v is not None:
                    out.append(f"{k} = {value(v)}")
            out.append("")
        with open(path, "w") as f:
            f.write("\n".join(out))
