# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class Probe(gl.Contract):
    note: str

    def __init__(self):
        self.note = "probe-v1"

    @gl.public.view
    def get_note(self) -> str:
        return self.note

    @gl.public.view
    def probe_api(self) -> str:
        feats = []
        for name in ("chain", "vm", "nondet", "eq_principle", "message", "Contract", "public"):
            feats.append(f"gl.{name}={hasattr(gl, name)}")
        try:
            ch = getattr(gl, "chain", None)
            feats.append("gl.chain.Account=" + str(hasattr(ch, "Account") if ch else False))
        except Exception as e:
            feats.append("gl.chain.Account=err:" + type(e).__name__)
        try:
            import genlayer.types  # noqa: F401
            feats.append("genlayer.types=ok")
        except Exception as e:
            feats.append("genlayer.types=err:" + type(e).__name__)
        try:
            from genlayer import chain  # noqa: F401
            feats.append("from genlayer import chain=ok," + str(hasattr(chain, "Account")))
        except Exception as e:
            feats.append("from genlayer import chain=err:" + type(e).__name__)
        try:
            feats.append("balance=" + type(self.balance).__name__ + ":" + str(self.balance))
        except Exception as e:
            feats.append("balance=err:" + type(e).__name__)
        try:
            nd = getattr(gl, "nondet", None)
            feats.append("nondet.exec_prompt=" + str(hasattr(nd, "exec_prompt") if nd else False))
        except Exception as e:
            feats.append("nondet.exec_prompt=err:" + type(e).__name__)
        try:
            ep = getattr(gl, "eq_principle", None)
            feats.append("eq.prompt_comparative=" + str(hasattr(ep, "prompt_comparative") if ep else False))
        except Exception as e:
            feats.append("eq.prompt_comparative=err:" + type(e).__name__)
        try:
            feats.append("as_hex=" + str(hasattr(Address(b"\x00" * 20), "as_hex")))
        except Exception as e:
            feats.append("as_hex=err:" + type(e).__name__)
        return " | ".join(feats)

    @gl.public.view
    def probe_types(self) -> dict:
        return {"dict_view": True, "len": 2}

    @gl.public.view
    def dump(self) -> str:
        import genlayer
        gl_names = ",".join(n for n in dir(gl) if not n.startswith("_"))
        pkg_names = ",".join(n for n in dir(genlayer) if not n.startswith("_"))
        self_names = ",".join(n for n in dir(self) if not n.startswith("_"))
        return f"GL[{gl_names}] || PKG[{pkg_names}] || SELF[{self_names}]"

    @gl.public.view
    def dump2(self) -> str:
        adv = ",".join(n for n in dir(gl.advanced) if not n.startswith("_"))
        prox = ",".join(n for n in dir(gl.ContractProxy) if not n.startswith("_"))
        msg = ",".join(n for n in dir(gl.message) if not n.startswith("_"))
        try:
            p = gl.get_contract_at(Address(b"\x11" * 20))
            inst = ",".join(n for n in dir(p) if not n.startswith("_"))
        except Exception as e:
            inst = "err:" + type(e).__name__
        try:
            em = gl.get_contract_at(Address(b"\x11" * 20)).emit
            import inspect
            sig = "emit-callable"
            try:
                sig = str(inspect.signature(em))
            except Exception:
                pass
            emit_info = sig
        except Exception as e:
            emit_info = "err:" + type(e).__name__
        return f"ADV[{adv}] || PROXY[{prox}] || MSG[{msg}] || INST[{inst}] || EMIT[{emit_info}]"

    @gl.public.view
    def dump_candidates(self) -> str:
        feats = []
        for name in ("transfer", "emit_transfer", "send", "eth_send", "Account", "account",
                     "advanced", "evm", "eth", "deploy_contract", "get_contract_at"):
            feats.append(f"gl.{name}={hasattr(gl, name)}")
        for name in ("transfer", "emit_transfer", "send", "balance", "address"):
            feats.append(f"self.{name}={hasattr(self, name)}")
        return " | ".join(feats)
