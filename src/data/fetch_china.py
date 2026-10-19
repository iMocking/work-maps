# -*- coding: utf-8 -*-
"""重新下载34个省级行政区 GeoJSON 并用 Python 合并（保真 JSON 结构），生成 chinaGeo.js"""
import json
import urllib.request
import os

BASE = "https://geo.datav.aliyun.com/areas_v3/bound"
CODES = ["110000","120000","130000","140000","150000","210000","220000","230000",
         "310000","320000","330000","340000","350000","360000","370000",
         "410000","420000","430000","440000","450000","460000","500000",
         "510000","520000","530000","540000","610000","620000","630000",
         "640000","650000","710000","810000","820000"]

features = []
for code in CODES:
    url = f"{BASE}/{code}.json"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        feats = data.get("features", [])
        features.extend(feats)
        names = [f["properties"]["name"] for f in feats]
        print("OK", code, "/".join(names))
    except Exception as e:
        print("SKIP", code, e)

fc = {"type": "FeatureCollection", "features": features}

def round_coords(v):
    if isinstance(v, list):
        if v and isinstance(v[0], (int, float)):
            return [round(x, 3) for x in v]
        return [round_coords(x) for x in v]
    return v

for f in fc["features"]:
    f["geometry"]["coordinates"] = round_coords(f["geometry"]["coordinates"])

out = ("// 中国省级边界数据（离线内置，含34个省级行政区）\n"
       "// 来源：DataV.GeoAtlas 公开地理数据，坐标已精简至 0.001°\n"
       "// 生成方式：python 脚本下载合并，保真 JSON 结构\n\n"
       "export const CHINA_GEOJSON = " +
       json.dumps(fc, ensure_ascii=False, separators=(",", ":")) + "\n")

target = os.path.join(os.path.dirname(__file__), "chinaGeo.js")
with open(target, "w", encoding="utf-8") as fp:
    fp.write(out)
print("TOTAL features:", len(features), "bytes:", len(out))
