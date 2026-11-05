#!/usr/bin/env python3
"""Windows launcher for original V6B Generator Studio.

Double-click the packaged EXE. It starts the Python-powered generator on
127.0.0.1, opens the XP-style Studio in the default browser, and keeps a tiny
desktop controller so the service can be stopped cleanly. No Render needed.
"""
from __future__ import annotations

import os
import shutil
import sys
import threading
import webbrowser

import server


def stop_jobs():
    for job in list(server.JOBS.values()):
        shutil.rmtree(job["root"], ignore_errors=True)
    server.JOBS.clear()


def run_headless():
    """Used by Windows CI to smoke-test the bundled EXE without a GUI."""
    http = server.ThreadingHTTPServer(("127.0.0.1", int(os.getenv("V6B_PORT", "8766"))), server.Handler)
    print("V6B_STUDIO_READY", http.server_address[1], flush=True)
    try:
        http.serve_forever()
    finally:
        http.server_close()
        stop_jobs()


def run_desktop():
    import tkinter as tk
    from tkinter import messagebox

    try:
        http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    except OSError as exc:
        window = tk.Tk()
        window.withdraw()
        messagebox.showerror("V6B Generator Studio", f"Cannot start local server:\n{exc}")
        window.destroy()
        return 1

    port = http.server_address[1]
    url = f"http://127.0.0.1:{port}/"
    thread = threading.Thread(target=http.serve_forever, daemon=True, name="v6b-local-service")
    thread.start()

    root = tk.Tk()
    root.title("V6B Generator Studio")
    root.geometry("412x240")
    root.resizable(False, False)
    root.configure(bg="#e9eef9")

    def label(text, size=10, weight="normal", fg="#304660", pady=6):
        tk.Label(root, text=text, font=("Tahoma", size, weight), bg="#e9eef9",
                 fg=fg, pady=pady).pack()

    label("✳  V6B GENERATOR STUDIO", 14, "bold", "#135bb2", 16)
    label("Native character generator is running locally.", 10)
    label("No internet, Render, or Python installation required.", 9, fg="#59718a")
    label(f"Local address: {url}", 9, fg="#355579")

    row = tk.Frame(root, bg="#e9eef9")
    row.pack(pady=10)

    def open_studio():
        webbrowser.open(url, new=1)

    def close_studio():
        root.withdraw()
        http.shutdown()
        http.server_close()
        thread.join(timeout=2)
        stop_jobs()
        root.destroy()

    tk.Button(row, text="OPEN GENERATOR", font=("Tahoma", 9, "bold"),
              command=open_studio, bg="#1c72d2", fg="white",
              activebackground="#328be6", width=20).pack(side=tk.LEFT, padx=5)
    tk.Button(row, text="EXIT", font=("Tahoma", 9, "bold"),
              command=close_studio, width=11).pack(side=tk.LEFT, padx=5)
    root.protocol("WM_DELETE_WINDOW", close_studio)
    root.after(550, open_studio)

    try:
        root.mainloop()
    finally:
        # Safe even if the window was closed using the OS control.
        try:
            http.shutdown()
            http.server_close()
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    if os.environ.get("V6B_DESKTOP_HEADLESS") == "1":
        run_headless()
    else:
        sys.exit(run_desktop())
