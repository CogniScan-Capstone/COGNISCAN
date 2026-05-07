from fastapi import FastAPI

# mengambil fungsi AI dari folder analyzer
from analyzer.main import analyze_narrative

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to CogniScan API."}

@app.post("/deteksi-kognitif")
def deteksi_teks(teks_user: str):
    # memasukan teks user ke dalam llm
    hasil_ai = analyze_narrative(teks_user)
    return hasil_ai