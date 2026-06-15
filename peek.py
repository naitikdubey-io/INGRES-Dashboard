import pandas as pd
import os

files = [f for f in os.listdir('.') if f.endswith('.xlsx')]
for f in files:
    print(f"File: {f}")
    try:
        df = pd.read_excel(f, nrows=5)
        print("Columns:", df.columns.tolist())
        print(df.head())
        print("---")
    except Exception as e:
        print("Error:", e)
