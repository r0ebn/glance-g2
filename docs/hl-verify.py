import json, os, subprocess

def post(payload):
    r = subprocess.run(
        ["curl", "-s", "--max-time", "15", "-X", "POST",
         "https://api.hyperliquid.xyz/info",
         "-H", "Content-Type: application/json", "-d", json.dumps(payload)],
        capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

now_ms = int(subprocess.run(["date", "+%s%3N"], capture_output=True, text=True, check=True).stdout.strip())
t24 = now_ms - 24 * 3600 * 1000
start25 = now_ms - 25 * 3600 * 1000

mids = post({"type": "allMids"})
for coin, midkey, candle_coin in [("BTC", "BTC", "BTC"), ("ETH", "ETH", "ETH"), ("SOL", "SOL", "SOL"), ("HYPE", "HYPE", "@107")]:
    candles = post({"type": "candleSnapshot", "req": {"coin": candle_coin, "interval": "1h", "startTime": start25, "endTime": now_ms}})
    cover = [c for c in candles if c["t"] <= t24 <= c["T"]]
    mid = float(mids[midkey])
    if cover:
        o = float(cover[0]["o"])
        chg = (mid - o) / o * 100
        print(f"{coin}: mid={mid} open24hAgo={o} candle_t={cover[0]['t']} change24h={chg:.2f}%")
    else:
        print(f"{coin}: NO covering candle (got {len(candles)} candles)")
