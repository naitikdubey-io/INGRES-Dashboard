import os
import glob
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Set API Keys via environment variables (DO NOT HARDCODE for GitHub)
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")
os.environ["HF_TOKEN"] = os.getenv("HF_TOKEN", "")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store the vector store and raw stats
vector_store = None
stats_data = {"files_processed": 0, "total_rows": 0, "file_stats": [], "top_districts": []}

def initialize_rag():
    global vector_store, stats_data
    print("Initializing RAG system...")
    
    excel_files = glob.glob("*.xlsx")
    docs = []
    all_rainfall_data = []
    
    for file in excel_files:
        try:
            df = pd.read_excel(file)
            
            # Extract clean multi-level headers (Rows 6, 7, 8 in INGRES report)
            h1 = df.iloc[6].ffill()
            h2 = df.iloc[7].ffill()
            h3 = df.iloc[8].ffill()
            
            cols = []
            for c1, c2, c3 in zip(h1, h2, h3):
                col_name = []
                if pd.notna(c1) and str(c1) != "nan": col_name.append(str(c1).strip())
                if pd.notna(c2) and str(c2) != "nan": col_name.append(str(c2).strip())
                if pd.notna(c3) and str(c3) != "nan": col_name.append(str(c3).strip())
                cols.append(" - ".join(col_name))
            
            df.columns = cols
            df = df.iloc[10:] # Skip headers and empty rows
            
            # Filter specifically to Rainfall and geographic columns
            filtered_cols = [c for c in df.columns if 'STATE' in c or 'DISTRICT' in c or 'BLOCK' in c or 'Rainfall' in c]
            df = df[filtered_cols]
            
            target_col = [c for c in df.columns if 'Rainfall' in c and 'Total' in c]
            if target_col and 'DISTRICT' in df.columns:
                col = target_col[0]
                df_agg = df.copy()
                df_agg[col] = pd.to_numeric(df_agg[col], errors='coerce').fillna(0)
                agg = df_agg.groupby('DISTRICT')[col].sum().reset_index()
                all_rainfall_data.append((agg, col))
            
            row_count = len(df)
            col_count = len(df.columns)
            
            stats_data["files_processed"] += 1
            stats_data["total_rows"] += row_count
            stats_data["file_stats"].append({
                "name": file,
                "rows": row_count,
                "cols": col_count
            })
            
            # Convert each row to a string document
            for index, row in df.iterrows():
                row_dict = row.dropna().to_dict()
                if row_dict:
                    text_content = " | ".join([f"{k}: {v}" for k, v in row_dict.items() if str(v).strip() != "0" and "S.No" not in str(k)])
                    docs.append(Document(page_content=text_content, metadata={"source": file, "row": index}))
        except Exception as e:
            print(f"Error processing {file}: {e}")

    if not docs:
        print("No data found to index.")
        return

    if all_rainfall_data:
        # Extract col from the first tuple
        col = all_rainfall_data[0][1]
        combined_agg = pd.concat([item[0] for item in all_rainfall_data], ignore_index=True)
        final_agg = combined_agg.groupby('DISTRICT')[col].sum().reset_index()
        final_agg = final_agg.sort_values(col, ascending=False).head(10)
        # Rename column to "Total_Rainfall" to make frontend mapping easier
        final_agg = final_agg.rename(columns={col: "Total_Rainfall"})
        stats_data["top_districts"] = final_agg.to_dict(orient="records")

    # Text Splitting
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=100)
    split_docs = text_splitter.split_documents(docs)
    
    # Embeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Vector Store
    vector_store = FAISS.from_documents(split_docs, embeddings)
    print("RAG initialization complete.")

@app.on_event("startup")
async def startup_event():
    initialize_rag()

class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        if not vector_store:
            return {"response": "The RAG system is not initialized or no data was found."}
        
        docs = vector_store.similarity_search(req.query, k=5)
        context = "\n".join([d.page_content for d in docs])
        
        prompt = (
            "Answer the following question based only on the provided context.\n"
            f"Context: {context}\n"
            f"Question: {req.query}\n"
            "Answer:"
        )
        
        llm = ChatGroq(model_name="llama-3.1-8b-instant")
        response = llm.invoke(prompt)
        
        return {"response": response.content}
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        print(err_str)
        return {"response": f"Backend Error: {str(e)}"}

@app.get("/api/data")
async def get_stats():
    return stats_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
