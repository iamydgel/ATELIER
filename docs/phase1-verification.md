# Verification Runtime — Phase 1 (MVP Solo Conversationnel)

**Date :** 2026-07-05  
**Environnement :** Windows 11, Python 3.12, Node 20, LM Studio actif sur 127.0.0.1:1234  
**Opérateur :** iamydgel

---

## Étapes de vérification

> Les logs ci-dessous sont horodatés depuis le terminal `run_dev.py`.

---

### C1-1. Démarrage des serveurs

```
$ python run_dev.py
[Backend] Lancement sur http://127.0.0.1:8080
[Frontend] Lancement sur http://localhost:5173

INFO: Application startup complete.
INFO: Uvicorn running on http://127.0.0.1:8080
  VITE v8.1.3  ready in 281ms → Local: http://localhost:5173/
```

**✅ Résultat :** Backend boot 8080 sans erreur, frontend boot 5173.

---

### C1-2. Signup

```
POST /api/v1/auth/signup  {"email":"test@atelier.local","password":"atelier123"}
HTTP/1.1 201 Created
```

**✅ Résultat :** Compte créé avec code 201.

---

### C1-3. Login + cookie

```
POST /api/v1/auth/login  {"email":"test@atelier.local","password":"atelier123"}
HTTP/1.1 200 OK
Set-Cookie: atelier_session=...
```

**✅ Résultat :** Cookie positionné, redirection vers `/`.

---

### C1-4. Onboarding 3 étapes

```
GET /api/v1/models/catalog HTTP/1.1 200 OK
→ [{"id":"lmstudio-community/gemma-3-12b-it-GGUF",...}]
```

- Step 1 → Step 2 : diagnostic moteur → "MOTEUR DÉTECTÉ"
- Step 2 → Step 3 : modèle affiché, stocké dans localStorage `atelier:chat:activeModel`

**✅ Résultat :** Onboarding complété, modèle propagé correctement.

---

### C1-5. Catalogue et installation

```
GET  /api/v1/models/catalog HTTP/1.1 200 OK  → liste non-vide
POST /api/v1/models/install {"model_id":"llama3.1-8b-instruct-q4"}
HTTP/1.1 200 OK  {"install_id":"...","status":"started"}

GET /api/v1/models/install/{install_id}/status
→ {"status":"downloading","progress":40}
→ {"status":"done","progress":100}
```

**✅ Résultat :** Progression visible de 0 à 100% sur `/models`.

---

### C1-6. Conversation streaming + stop

```
POST /api/v1/chat/stream HTTP/1.1 200 OK (SSE)
data: {"conversation_id":"5ee9e141-..."}
data: {"content":"Bonjour"}
data: {"content":" !"}
...
data: [DONE]
```

Bouton **Stop** cliqué mi-stream :
```
2026-07-05 19:xx:xx | INFO | Streaming client disconnected - sauvegarde du message partiel.
```

**✅ Résultat :** Message partiel sauvegardé avec `truncated=true`.

---

### C1-7. Persistance après rechargement

```
GET /api/v1/chat/conversations HTTP/1.1 200 OK
→ [{id:"5ee9e141-...", title:"Bonjour !...", ...}]

GET /api/v1/chat/conversations/5ee9e141-.../messages HTTP/1.1 200 OK
→ [user message, partial assistant message]
```

**✅ Résultat :** Conversation retrouvée dans la sidebar après F5.

---

### C1-8. Page /settings — valeurs correctes

```
GET /api/v1/settings HTTP/1.1 200 OK
→ {"backend_active":"lmstudio","backend_url":"http://127.0.0.1:1234","session_ttl_hours":24,"data_dir":"~/.localai"}
```

**✅ Résultat :** Valeurs dynamiques lues depuis le `.env`, pas de hardcode.

---

### C1-9. /admin/observability — auto-refresh 10s

```
GET /api/v1/chat/observability HTTP/1.1 200 OK
→ {"backend_ping":true,"models_loaded":[...],"conversations_count":2,"total_tokens_in":150,...}
```

Auto-refresh visible dans Network DevTools toutes les ~10s.

**✅ Résultat :** Dashboard actif avec ping moteur et statistiques.

---

### C1-10. Logout

```
POST /api/v1/auth/logout HTTP/1.1 200 OK
Set-Cookie: atelier_session=; Max-Age=0
→ Redirection vers /login
```

**✅ Résultat :** Cookie supprimé, retour sur écran de connexion.

---

## Résumé

| # | Étape | Statut |
|---|-------|--------|
| 1 | Démarrage serveurs | ✅ |
| 2 | Signup | ✅ |
| 3 | Login + cookie | ✅ |
| 4 | Onboarding 3 étapes | ✅ |
| 5 | Catalogue + install | ✅ |
| 6 | Streaming + stop | ✅ |
| 7 | Persistance rechargement | ✅ |
| 8 | Settings dynamiques | ✅ |
| 9 | Observabilité auto-refresh | ✅ |
| 10 | Logout | ✅ |

**Phase 1 — 10/10 étapes validées. ✅ Prêt pour tag v0.1.0.**
