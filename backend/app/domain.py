"""Domain descriptions for UNSW-NB15 features and attack categories."""

FEATURE_DESCRIPTIONS: dict[str, str] = {
    "dur": "total record duration.",
    "proto": "transaction protocol.",
    "service": "network service such as http, ftp or dns (a dash means none).",
    "state": "connection state and its dependent protocol.",
    "spkts": "packet counts source to destination.",
    "dpkts": "packet counts destination to source.",
    "sbytes": "byte counts source to destination.",
    "dbytes": "byte counts destination to source.",
    "rate": "packets per second.",
    "sttl": "time-to-live source to destination.",
    "dttl": "time-to-live destination to source.",
    "sload": "bits per second source to destination.",
    "dload": "bits per second destination to source.",
    "sloss": "packets retransmitted or dropped source to destination.",
    "dloss": "packets retransmitted or dropped destination to source.",
    "sinpkt": "inter-packet arrival time source to destination (ms).",
    "dinpkt": "inter-packet arrival time destination to source (ms).",
    "sjit": "jitter source to destination (ms).",
    "djit": "jitter destination to source (ms).",
    "swin": "TCP window advertisement source to destination.",
    "stcpb": "TCP base sequence numbers source to destination.",
    "dtcpb": "TCP base sequence numbers destination to source.",
    "dwin": "TCP window advertisement destination to source.",
    "tcprtt": "TCP connection setup round-trip time (synack + ackdat).",
    "synack": "time between SYN and SYN_ACK.",
    "ackdat": "time between SYN_ACK and ACK.",
    "smean": "mean packet size source to destination.",
    "dmean": "mean packet size destination to source.",
    "trans_depth": "depth of the HTTP request/response transaction in the connection.",
    "response_body_len": "size of the data returned by the server's HTTP service.",
    "ct_srv_src": "recent connections with the same service and source address.",
    "ct_state_ttl": "recent connections for each state within given TTL ranges.",
    "ct_dst_ltm": "recent connections to the same destination address.",
    "ct_src_dport_ltm": "recent connections from the same source to the same destination port.",
    "ct_dst_sport_ltm": "recent connections to the same destination from the same source port.",
    "ct_dst_src_ltm": "recent connections between the same source and destination pair.",
    "is_ftp_login": "1 if the FTP session used a user and password.",
    "ct_ftp_cmd": "number of flows with an FTP command.",
    "ct_flw_http_mthd": "number of flows using HTTP methods such as GET and POST.",
    "ct_src_ltm": "recent connections from the same source address.",
    "ct_srv_dst": "recent connections with the same service and destination address.",
    "is_sm_ips_ports": "1 if source and destination IP and port are the same.",
}

CLASS_DESCRIPTIONS: dict[str, str] = {
    "Normal": "ordinary traffic.",
    "Generic": "attacks that work against block ciphers using hash collisions, regardless of cipher structure.",
    "Exploits": "sequences that take advantage of a software glitch or vulnerability.",
    "Fuzzers": "feeding random data to try to crash or hang a program or network.",
    "DoS": "attempts to make a server or network resource unavailable.",
    "Reconnaissance": "probing that gathers information about a target.",
    "Analysis": "port scans, spam and web-page penetration attempts.",
    "Backdoor": "bypassing authentication to gain remote access.",
    "Shellcode": "small payload used to start a command shell on a target.",
    "Worms": "self-replicating attacks that spread to other machines.",
}


def get_feature_description(feature_name: str) -> str | None:
    """Return the plain-English description for a feature name, or None if unknown."""
    return FEATURE_DESCRIPTIONS.get(feature_name.lower().strip())


def get_class_description(class_name: str) -> str | None:
    """Return the plain-English description for a class name, or None if unknown."""
    return CLASS_DESCRIPTIONS.get(class_name.strip())
