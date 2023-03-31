import {
    AddOrRemoveCollateral,
    AddPosition, AddTrailingStop,
    ConfirmDelayTransaction,
    NewOrder,
    UpdateOrder, UpdateTrailingStop
} from "../generated/PositionVault/PositionVault";
import {TransactionDepth, UserOrder, UserPositionStat, UserTrade} from "../generated/schema";
import {
    POSITION_LIMIT,
    POSITION_MARKET,
    POSITION_STOP_LIMIT,
    POSITION_STOP_MARKET,
    POSITION_TRAILING_STOP
} from "./constants";
import {BigInt} from "@graphprotocol/graph-ts";

export function handleNewOrder(event: NewOrder): void {
    saveTransactionDepth(event)
    saveUserPositionStat(event)
    if (event.params.positionType.toI32() == 0) {
        return
    }
    saveUserOrder(event)
}

export function handleUpdateOrder(event: UpdateOrder): void {
    let transactionDepth = TransactionDepth.load(event.params.key.toHexString())
    if (transactionDepth) {
        if (event.params.positionType.toI32() == 1) {
            transactionDepth.price = transactionDepth.lmtPrice;
        }
        transactionDepth.status = getOrderStatus(event.params.orderStatus)
        transactionDepth.save()
    }
    let userOrder = UserOrder.load(event.params.key.toHexString())
    if (userOrder) {
        userOrder.orderStatus = getOrderStatus(event.params.orderStatus);
        userOrder.positionType = getPositionType(event.params.positionType.toI32())
        userOrder.save()
    }
}

export function handleConfirmDelayTransaction(event: ConfirmDelayTransaction): void {
    let userOrder = UserOrder.load(event.params.key.toHexString())
    if (userOrder) {
        userOrder.pendingDelayCollateral = BigInt.fromString('0')
        userOrder.pendingDelaySize = BigInt.fromString('0')
        userOrder.save()
        let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
        if(positionStatsEntity) {
            let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
            userTradeStatsEntity.key = event.params.key.toHexString()
            userTradeStatsEntity.account = userOrder.account
            userTradeStatsEntity.actionType = "ADD_POSITION"
            userTradeStatsEntity.amount = BigInt.fromString("0")
            userTradeStatsEntity.averagePrice = positionStatsEntity.averagePrice
            userTradeStatsEntity.collateral = userOrder.pendingDelayCollateral
            userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
            userTradeStatsEntity.fees = event.params.feeUsd
            userTradeStatsEntity.indexToken = positionStatsEntity.indexToken
            userTradeStatsEntity.isLong = positionStatsEntity.isLong
            userTradeStatsEntity.isPlus = true
            userTradeStatsEntity.markPrice = positionStatsEntity.markPrice
            userTradeStatsEntity.posId = positionStatsEntity.posId
            userTradeStatsEntity.positionType = positionStatsEntity.positionType
            userTradeStatsEntity.profitLoss = BigInt.fromString('0')
            userTradeStatsEntity.tradeVolume = userOrder.pendingDelaySize
            userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
            userTradeStatsEntity.save()
        }
    }
}
export function handleAddPosition(event: AddPosition): void {
    let userOrder = UserOrder.load(event.params.key.toHexString())
    if (userOrder) {
        userOrder.pendingDelayCollateral =event.params.collateral
        userOrder.pendingDelaySize = event.params.size
        userOrder.save()
    }
}

export function handleAddOrRemoveCollateral(event: AddOrRemoveCollateral): void {
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (positionStatsEntity) {
        let userTradeStatsEntity = new UserTrade(event.params.key.toHexString() + "-" + event.block.timestamp.toString())
        userTradeStatsEntity.key = event.params.key.toHexString()
        userTradeStatsEntity.account = positionStatsEntity.account
        userTradeStatsEntity.actionType = "EDIT_COLLATERAL"
        userTradeStatsEntity.amount = event.params.amount
        userTradeStatsEntity.averagePrice = positionStatsEntity.averagePrice
        userTradeStatsEntity.collateral = event.params.collateral
        userTradeStatsEntity.createdAt = event.block.timestamp.toI32()
        userTradeStatsEntity.fees = BigInt.fromString('0')
        userTradeStatsEntity.indexToken = positionStatsEntity.indexToken
        userTradeStatsEntity.isLong = positionStatsEntity.isLong
        userTradeStatsEntity.isPlus = event.params.isPlus
        userTradeStatsEntity.markPrice = positionStatsEntity.markPrice
        userTradeStatsEntity.posId = positionStatsEntity.posId
        userTradeStatsEntity.positionType = positionStatsEntity.positionType
        userTradeStatsEntity.profitLoss = BigInt.fromString('0')
        userTradeStatsEntity.tradeVolume = event.params.size
        userTradeStatsEntity.transactionHash = event.transaction.hash.toHexString()
        userTradeStatsEntity.save()
        positionStatsEntity.collateral = event.params.collateral
        positionStatsEntity.size = event.params.size
        positionStatsEntity.save()
    }
}

function iniUserOrder(key: string, positionStatsEntity: UserPositionStat): UserOrder{
    let userOrder = new UserOrder(key)
    userOrder.indexToken = positionStatsEntity.indexToken
    userOrder.account = positionStatsEntity.account
    userOrder.isLong = positionStatsEntity.isLong
    userOrder.posId = positionStatsEntity.posId
    return userOrder
}

export function handleAddTrailingStop(event: AddTrailingStop): void {
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (positionStatsEntity) {
        let userOrder = UserOrder.load(event.params.key.toHexString());
        if(!userOrder) {
            userOrder = iniUserOrder(event.params.key.toHexString(), positionStatsEntity)
            userOrder.pendingDelayCollateral = BigInt.zero()
            userOrder.pendingDelaySize = BigInt.zero()
            userOrder.lmtPrice = BigInt.zero()
            userOrder.createdAt = event.block.timestamp.toI32()
        }
        userOrder.pendingCollateral = event.params.data[0];
        userOrder.orderStatus = "PENDING";
        userOrder.positionType = "Trailing Stop";
        userOrder.stepType = event.params.data[2];
        userOrder.stpPrice = event.params.data[3];
        userOrder.stepAmount = event.params.data[4];
        userOrder.save()
    }
}

export function handleUpdateTrailingStop(event: UpdateTrailingStop): void {
    let userOrder = UserOrder.load(event.params.key.toHexString());
    if (userOrder) {
        userOrder.stpPrice = event.params.stpPrice
    }
}

function getOrderStatus(orderStatus: i32): string {
    if (orderStatus == 0) {
        return "NONE";
    } else if (orderStatus == 1) {
        return "PENDING";
    } else if (orderStatus == 2) {
        return "FILLED";
    } else {
        return "CANCELED";
    }
}

function saveTransactionDepth(event: NewOrder): void {
    if (event.params.positionType.toI32() == POSITION_MARKET) {
        return;
    }
    let transactionDepth = TransactionDepth.load(event.params.key.toHexString());
    if (!transactionDepth) {
        transactionDepth = new TransactionDepth(event.params.key.toHexString());
        transactionDepth.token = event.params.indexToken.toHexString();
        transactionDepth.isLong = event.params.isLong
        transactionDepth.delFlag = false
        transactionDepth.amount = event.params.triggerData[3]
        if (event.params.positionType.toI32() == POSITION_LIMIT) {
            transactionDepth.price = event.params.triggerData[0]
            transactionDepth.lmtPrice = event.params.triggerData[0]
            transactionDepth.stpPrice = BigInt.zero()
        }else if (event.params.positionType.toI32() == POSITION_STOP_MARKET) {
            transactionDepth.price = event.params.triggerData[1]
            transactionDepth.lmtPrice  = BigInt.zero()
            transactionDepth.stpPrice =event.params.triggerData[1]
        }else if (event.params.positionType.toI32() == POSITION_STOP_LIMIT) {
            transactionDepth.price = event.params.triggerData[1]
            transactionDepth.lmtPrice = event.params.triggerData[0]
            transactionDepth.stpPrice =event.params.triggerData[1]
        }
        transactionDepth.status = getOrderStatus(event.params.orderStatus);
        transactionDepth.save()
    }
}

function saveUserPositionStat(event: NewOrder): void {
    let positionStatsEntity = UserPositionStat.load(event.params.key.toHexString())
    if (!positionStatsEntity) {
        positionStatsEntity = new UserPositionStat(event.params.key.toHexString())
        positionStatsEntity.account = event.params.account.toHexString()
        positionStatsEntity.averagePrice = BigInt.fromString('0')
        positionStatsEntity.collateral = BigInt.fromString('0')
        positionStatsEntity.closedAt = 0
        positionStatsEntity.closeHash = ""
        positionStatsEntity.createdAt = event.block.timestamp.toI32()
        positionStatsEntity.createHash = event.transaction.hash.toHexString()
        positionStatsEntity.entryFundingRate = BigInt.fromString('0')
        positionStatsEntity.feeUsd = BigInt.fromString('0')
        positionStatsEntity.indexToken = event.params.indexToken.toHexString()
        positionStatsEntity.isLong = event.params.isLong
        positionStatsEntity.key = event.params.key.toHexString()
        positionStatsEntity.markPrice = BigInt.fromString('0')
        positionStatsEntity.positionType = getPositionType(event.params.positionType.toI32());
        if (event.params.positionType.toI32() == 0) {
            positionStatsEntity.lmtPrice = BigInt.fromString('0')
        } else {
            positionStatsEntity.lmtPrice = event.params.triggerData[0]
        }
        positionStatsEntity.positionStatus = "OPEN"
        positionStatsEntity.posId = event.params.posId
        positionStatsEntity.realisedPnl = BigInt.fromString('0')
        positionStatsEntity.reserveAmount = BigInt.fromString('0')
        positionStatsEntity.size = BigInt.fromString('0')
        positionStatsEntity.stpPrice = event.params.triggerData[1]
        positionStatsEntity.save()
    }
}

function saveUserOrder(event: NewOrder): void {
    let userOrder = new UserOrder(event.params.key.toHexString())
    userOrder.indexToken = event.params.indexToken.toHexString()
    userOrder.account = event.params.account.toHexString()
    userOrder.isLong = event.params.isLong
    userOrder.posId = event.params.posId
    userOrder.lmtPrice = event.params.triggerData[0]
    userOrder.pendingCollateral = event.params.triggerData[2]
    userOrder.orderStatus = getOrderStatus(event.params.orderStatus)
    userOrder.pendingDelayCollateral = BigInt.fromString('0')
    userOrder.pendingDelaySize = BigInt.fromString('0')
    userOrder.positionType = getPositionType(event.params.positionType.toI32());
    userOrder.stepType = BigInt.zero();
    userOrder.stpPrice = event.params.triggerData[1];
    userOrder.stepAmount = BigInt.zero();
    userOrder.createdAt = event.block.timestamp.toI32()
}

function getPositionType(positionType: i32): string {
    if (positionType == POSITION_MARKET) {
        return "Market Order";
    } else if (positionType == POSITION_LIMIT) {
        return "Limit Order";
    } else if (positionType == POSITION_STOP_MARKET) {
        return "Stop Market";
    } else if(positionType == POSITION_STOP_LIMIT){
        return "Stop Limit";
    }else{
        return "Trailing Stop"
    }
}

