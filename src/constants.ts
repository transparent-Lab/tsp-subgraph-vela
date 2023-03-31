import {BigInt} from "@graphprotocol/graph-ts";
export let BTC = "0x61159e7cb1f06476a217dabdb5e03527ab69217a"
export let ETH = "0xa6e249ffb81cf6f28ab021c3bd97620283c7335f"

export let POSITION_MARKET = 0
export let POSITION_LIMIT = 1

export let POSITION_STOP_MARKET = 2

export let POSITION_STOP_LIMIT = 3

export let POSITION_TRAILING_STOP = 4

export let ORDER_STATUS_NONE = "NONE"

export let ORDER_STATUS_PENDING = "PENDING"

export let ORDER_STATUS_FILLED = "NONE"

export let ORDER_STATUS_CANCELED = "NONE"

enum ORDER_STATUS {
    NONE,
    PENDING,
    FILLED,

    CANCELED
}