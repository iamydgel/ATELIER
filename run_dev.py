import os
import subprocess
import sys
import time

def run():
    print("====================================================================")
    print("   Démarrage de la console L'Atelier Local AI (Développement)       ")
    print("====================================================================")
    
    # Resolve local python interpreter in virtual environment
    venv_python = os.path.join(".venv", "Scripts", "python.exe") if os.name == "nt" else os.path.join(".venv", "bin", "python")
    python_cmd = venv_python if os.path.exists(venv_python) else sys.executable
    
    # 1. Start Backend FastAPI
    print(f"\n[Backend] Lancement sur http://127.0.0.1:8080 (via {python_cmd})")
    backend_proc = subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "app.main:app", "--port", "8080", "--host", "127.0.0.1"]
    )
    
    # 2. Start Frontend Vite/React
    print("\n[Frontend] Lancement sur http://localhost:5173 (via npm)")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd="web"
    )
    
    print("\n====================================================================")
    print("  Appuyez sur CTRL+C pour arrêter les deux serveurs proprement.       ")
    print("====================================================================")
    
    try:
        while True:
            # Monitor sub-processes
            if backend_proc.poll() is not None:
                print("\n[Erreur] Le serveur backend s'est arrêté inopinément.")
                break
            if frontend_proc.poll() is not None:
                print("\n[Erreur] Le serveur frontend s'est arrêté inopinément.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Système] Demande d'arrêt reçue (CTRL+C)...")
    finally:
        # Clean termination of processes
        print("[Système] Arrêt du Backend...")
        backend_proc.terminate()
        print("[Système] Arrêt du Frontend...")
        frontend_proc.terminate()
        
        try:
            backend_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            backend_proc.kill()
            
        try:
            frontend_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            frontend_proc.kill()
            
        print("\n[Système] Tous les serveurs sont arrêtés. À bientôt !")

if __name__ == "__main__":
    run()
