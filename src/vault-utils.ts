import {
    ClosePosition,
    DecreasePosition,
    IncreasePosition,
    LiquidatePosition
} from "../generated/updatePosition/VaultUtils";
import {ETH} from "./constants";
import {updatePeriodAmountCandle} from "./fast-price-feed";
import {PositionTrigger, UserPositionStat, UserTrade} from "../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts";

export function handleIncreasePosition(event: IncreasePosition): void {
    let token : string = event.params.indexToken.toHexString();
    if (token == ETH) {
        let price = event.params.posData[5];
        let amount = event.params.posData[1];
        let vol = price.times(amount)
        let timestamp = event.block.timestamp;
        updatePeriodAmountCandle(token, amount, vol, timestamp);
    }

    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (!positionStatsEntity) {
        positionStatsEntity = new UserPositionStat(event.params.key.toHexString())
        positionStatsEntity.account = event.params.account.toHexString()
        positionStatsEntity.averagePrice = BigInt.fromString('0')
        positionStatsEntity.closeHash = ""
        positionStatsEntity.createdAt = 0
        positionStatsEntity.createHash = ""
        positionStatsEntity.collateral = BigInt.fromString('0')
        positionStatsEntity.closedAt = 0
        positionStatsEntity.entryFundingRate = BigInt.fromString('0')
        positionStatsEntity.isLong = event.params.isLong
        positionStatsEntity.key = event.params.key.toHexString()
        positionStatsEntity.feeUsd = BigInt.fromString('0')
        positionStatsEntity.indexToken = event.params.indexToken.toHexString()
        positionStatsEntity.lmtPrice = BigInt.fromString('0')
        positionStatsEntity.markPrice = BigInt.fromString('0')
        positionStatsEntity.posId = event.params.posId
        positionStatsEntity.positionStatus = "OPEN"
        positionStatsEntity.positionType = "Market Order"
        positionStatsEntity.realisedPnl = BigInt.fromString('0')
        positionStatsEntity.reserveAmount = BigInt.fromString('0')
        positionStatsEntity.size = BigInt.fromString('0')
        positionStatsEntity.stpPrice = BigInt.fromString('0')
    }
    let realCollateral = event.params.posData[0].minus(event.params.posData[6])
    positionStatsEntity.averagePrice = event.params.posData[4]
    if (positionStatsEntity.positionStatus == "CLOSED" || positionStatsEntity.positionStatus == "LIQUIDATED") {
        positionStatsEntity.collateral = realCollateral
        positionStatsEntity.feeUsd = event.params.posData[6]
        positionStatsEntity.size = event.params.posData[1]
        positionStatsEntity.closedAt = 0
        positionStatsEntity.closeHash = ""
    } else {
        positionStatsEntity.collateral = positionStatsEntity.collateral.plus(realCollateral)
        positionStatsEntity.feeUsd = positionStatsEntity.feeUsd.plus(event.params.posData[6])
        positionStatsEntity.size = positionStatsEntity.size.plus(event.params.posData[1])
    }
    positionStatsEntity.createdAt = event.block.timestamp.toI32()
    positionStatsEntity.createHash = event.transaction.hash.toHexString()
    positionStatsEntity.entryFundingRate = event.params.posData[3]
    positionStatsEntity.markPrice = event.params.posData[5]
    positionStatsEntity.reserveAmount = event.params.posData[2]
    positionStatsEntity.save()

    let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
    userTradeStatsEntity.key = event.params.key.toHexString()
    userTradeStatsEntity.account = event.params.account.toHexString()
    userTradeStatsEntity.actionType = "OPEN_POSITION"
    userTradeStatsEntity.amount = BigInt.fromString("0")
    userTradeStatsEntity.averagePrice = event.params.posData[4]
    userTradeStatsEntity.collateral = event.params.posData[0].minus(event.params.posData[6])
    userTradeStatsEntity.fees = event.params.posData[6]
    userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
    userTradeStatsEntity.indexToken = event.params.indexToken.toHexString()
    userTradeStatsEntity.isLong = event.params.isLong
    userTradeStatsEntity.isPlus = true
    userTradeStatsEntity.markPrice = event.params.posData[5]
    userTradeStatsEntity.posId = event.params.posId
    userTradeStatsEntity.positionType = positionStatsEntity.positionType
    userTradeStatsEntity.profitLoss = BigInt.fromString('0')
    userTradeStatsEntity.tradeVolume = positionStatsEntity.size
    userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
    userTradeStatsEntity.save()
}

export function handleDecreasePosition(event: DecreasePosition): void {
    let token = event.params.indexToken.toHexString();
    if (token == ETH) {
        let amount = event.params.posData[1];
        let price = event.params.posData[5];
        let vol = price.times(amount);
        let timestamp = event.block.timestamp;
        updatePeriodAmountCandle(token, amount, vol, timestamp);
    }
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (positionStatsEntity) {
        positionStatsEntity.size = positionStatsEntity.size.minus(event.params.posData[1])
        positionStatsEntity.collateral = positionStatsEntity.collateral.minus(event.params.posData[0])
        positionStatsEntity.reserveAmount = event.params.posData[2]
        positionStatsEntity.entryFundingRate = event.params.posData[3]
        let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
        if (positionStatsEntity.averagePrice.ge(BigInt.fromString('0'))) {
            let realisedPnl = event.params.posData[1].times(event.params.posData[5].minus(positionStatsEntity.averagePrice)).div(positionStatsEntity.averagePrice)
            positionStatsEntity.realisedPnl = positionStatsEntity.realisedPnl.plus(realisedPnl)
            userTradeStatsEntity.profitLoss = realisedPnl
        }else {
            userTradeStatsEntity.profitLoss = BigInt.fromString('0')
        }
        positionStatsEntity.feeUsd = positionStatsEntity.feeUsd.plus(event.params.posData[6])
        positionStatsEntity.averagePrice = event.params.posData[4]
        positionStatsEntity.markPrice = event.params.posData[5]
        positionStatsEntity.save()

        userTradeStatsEntity.key = event.params.key.toHexString()
        userTradeStatsEntity.account = event.params.account.toHexString()
        userTradeStatsEntity.actionType = "DECREASE_POSITION"
        userTradeStatsEntity.amount = BigInt.fromString("0")
        userTradeStatsEntity.averagePrice = positionStatsEntity.averagePrice
        userTradeStatsEntity.collateral = event.params.posData[0]
        userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
        userTradeStatsEntity.fees = event.params.posData[6]
        userTradeStatsEntity.indexToken = event.params.indexToken.toHexString()
        userTradeStatsEntity.isLong = event.params.isLong
        userTradeStatsEntity.isPlus = true
        userTradeStatsEntity.markPrice = event.params.posData[5]
        userTradeStatsEntity.posId = event.params.posId
        userTradeStatsEntity.positionType = positionStatsEntity.positionType
        userTradeStatsEntity.tradeVolume = event.params.posData[1]
        userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
        userTradeStatsEntity.save()
    }
}

export function handleClosePosition(event: ClosePosition): void {
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (positionStatsEntity) {
        let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
        userTradeStatsEntity.key = event.params.key.toHexString()
        userTradeStatsEntity.account = positionStatsEntity.account
        userTradeStatsEntity.actionType = "CLOSE_POSITION"
        userTradeStatsEntity.amount = BigInt.fromString("0")
        userTradeStatsEntity.averagePrice = positionStatsEntity.averagePrice
        userTradeStatsEntity.collateral = positionStatsEntity.collateral
        userTradeStatsEntity.fees = event.params.feeUsd
        userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
        userTradeStatsEntity.indexToken = positionStatsEntity.indexToken
        userTradeStatsEntity.isLong = positionStatsEntity.isLong
        userTradeStatsEntity.isPlus = true
        userTradeStatsEntity.markPrice = event.params.markPrice
        userTradeStatsEntity.posId = positionStatsEntity.posId
        userTradeStatsEntity.positionType = positionStatsEntity.positionType
        userTradeStatsEntity.profitLoss = event.params.realisedPnl
        userTradeStatsEntity.tradeVolume = positionStatsEntity.size
        userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
        userTradeStatsEntity.save()
        positionStatsEntity.closedAt = event.block.timestamp.toI32()
        positionStatsEntity.closeHash = event.transaction.hash.toHexString()
        positionStatsEntity.feeUsd = positionStatsEntity.feeUsd.plus(event.params.feeUsd)
        positionStatsEntity.markPrice = event.params.markPrice
        positionStatsEntity.realisedPnl = positionStatsEntity.realisedPnl.plus(event.params.realisedPnl)
        positionStatsEntity.positionStatus = "CLOSED"
        positionStatsEntity.save()
        let positionTriggerEntity = PositionTrigger.load(event.params.key.toHexString())
        if (positionTriggerEntity) {
            positionTriggerEntity.status = "CLOSED";
            positionTriggerEntity.save()
        }
    }
}

export function handleLiquidatePosition(event: LiquidatePosition): void {
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (positionStatsEntity) {
        let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
        userTradeStatsEntity.key = event.params.key.toHexString()
        userTradeStatsEntity.account = positionStatsEntity.account
        userTradeStatsEntity.actionType = "LIQUIDATE_POSITION"
        userTradeStatsEntity.amount = BigInt.fromString("0")
        userTradeStatsEntity.averagePrice = positionStatsEntity.averagePrice
        userTradeStatsEntity.collateral = positionStatsEntity.collateral
        userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
        userTradeStatsEntity.indexToken = positionStatsEntity.indexToken
        userTradeStatsEntity.fees = event.params.feeUsd
        userTradeStatsEntity.isLong = positionStatsEntity.isLong
        userTradeStatsEntity.isPlus = true
        userTradeStatsEntity.markPrice = event.params.markPrice
        userTradeStatsEntity.posId = positionStatsEntity.posId
        userTradeStatsEntity.positionType = positionStatsEntity.positionType
        userTradeStatsEntity.profitLoss = BigInt.fromString('-1').times(positionStatsEntity.collateral)
        userTradeStatsEntity.tradeVolume = positionStatsEntity.size
        userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
        userTradeStatsEntity.save()

        positionStatsEntity.closedAt = event.block.timestamp.toI32()
        positionStatsEntity.markPrice = event.params.markPrice
        positionStatsEntity.feeUsd = positionStatsEntity.feeUsd.plus(event.params.feeUsd)
        positionStatsEntity.realisedPnl = BigInt.fromString('-1').times(positionStatsEntity.collateral)
        positionStatsEntity.positionStatus = "LIQUIDATED"
        positionStatsEntity.save()
        let positionTriggerEntity = PositionTrigger.load(event.params.key.toHexString())
        if (positionTriggerEntity) {
            positionTriggerEntity.status = "CLOSED";
            positionTriggerEntity.save()
        }
    }
}

