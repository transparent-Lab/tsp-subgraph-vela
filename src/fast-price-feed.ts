import {BigInt, ethereum, ValueKind} from "@graphprotocol/graph-ts"
import {PriceCandle} from "../generated/schema"
import {BTC, ETH} from "./constants";
import {NewOrder} from "../generated/PositionVault/PositionVault";
import {SetLatestAnswer} from "../generated/FastPriceFeedEth/FastPriceFeed";
import {DecreasePosition, IncreasePosition} from "../generated/updatePosition/VaultUtils";

export function handleSetLatestAnswerBtc(event: SetLatestAnswer): void {
  let btcToken : string = BTC;
  updatePeriodPriceCandle(event, btcToken)
}

export function handleSetLatestAnswerEth(event: SetLatestAnswer): void {
  let ethToken : string = ETH;
  updatePeriodPriceCandle(event, ethToken)
}

function updatePeriodPriceCandle(event: SetLatestAnswer, token : string): void {
  updateCandlePrice(event, token, "5m")
  updateCandlePrice(event, token, "15m")
  updateCandlePrice(event, token, "1h")
  updateCandlePrice(event, token, "4h")
  updateCandlePrice(event, token, "1d")
}

export function updatePeriodAmountCandle(token: string, amount: BigInt, vol: BigInt, timestamp: BigInt): void {
  updateCandleAmount(token, amount, vol, timestamp, "5m")
  updateCandleAmount(token, amount, vol, timestamp, "15m")
  updateCandleAmount(token, amount, vol, timestamp, "1h")
  updateCandleAmount(token, amount, vol, timestamp, "4h")
  updateCandleAmount(token, amount, vol, timestamp, "1d")
}

function updateCandlePrice(event: SetLatestAnswer, token: string, period: string): void {
  let periodStart = timestampToPeriodStart(event.block.timestamp, period)
  let id = getId(token, period, periodStart)
  let entity = PriceCandle.load(id)
  let price = event.params.answer
  if (entity == null) {
    entity = new PriceCandle(id);
    entity.open  = getOpenPrice(token, period, price, periodStart);
    entity.high = price
    entity.low = price
    entity.timestamp = periodStart.toI32()
    entity.token = token
    entity.period = period
  } else {
    let high = entity.high;
    if ((high && high < price) || !high) {
      entity.high = price
    }
    let low = entity.low;
    if ((low && low> price) || !low) {
      entity.low = price
    }
    if (!entity.open) {
      entity.open = getOpenPrice(token, period, price, periodStart)
    }
  }
  entity.close = price
  entity.save()
}

function getOpenPrice(token: string, period: string, price: BigInt, periodStart: BigInt): BigInt {
  let prevId = getId(token, period, periodStart.minus(periodToSeconds(period)))
  let prevEntity = PriceCandle.load(prevId)
  if (prevEntity) {
    let close = prevEntity.close;
    return  close ? close : price
  }
  return price
}

function updateCandleAmount(token: string, amount: BigInt, vol: BigInt, timestamp: BigInt, period: string): void {
  let periodStart = timestampToPeriodStart(timestamp, period)
  let id = getId(token, period, periodStart)
  let entity = PriceCandle.load(id)
  if (entity == null) {
    entity = new PriceCandle(id)
  }
  let amountPre = entity.amount;
  entity.amount = amountPre ? amountPre.plus(amount) : amount
  let volPre = entity.vol;
  entity.vol = volPre ? volPre.plus(vol) : vol
  entity.timestamp = periodStart.toI32()
  entity.token = token
  entity.period = period
  entity.save()
}

function getId(token: string, period: string, periodStart: BigInt): string {
  return token + ":" + period + ":" + periodStart.toString()
}

function timestampToPeriodStart(timestamp: BigInt, period: string): BigInt {
  let seconds = periodToSeconds(period)
  // @ts-ignore
  return timestamp / seconds * seconds
}

function periodToSeconds(period: string): BigInt {
  let seconds: BigInt
  if (period == "5m") {
    seconds = BigInt.fromI32(5 * 60)
  } else if (period == "15m") {
    seconds = BigInt.fromI32(15 * 60)
  } else if (period == "1h") {
    seconds = BigInt.fromI32(60 * 60)
  } else if (period == "4h") {
    seconds = BigInt.fromI32(4 * 60 * 60)
  } else if (period == "1d") {
    seconds = BigInt.fromI32(24 * 60 * 60)
  } else {
    throw new Error("Invalid period")
  }
  return seconds
}

