import {UpdateOrder} from "../generated/PositionVault/PositionVault";
import {
    ExecuteTriggerOrders,
    UpdateTriggerOrders,
    UpdateTriggerStatus
} from "../generated/TriggerOrderManager/TriggerOrderManager";
import {PositionTrigger, Trigger, UserPositionStat} from "../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts";

export function handleExecuteTriggerOrders(event: ExecuteTriggerOrders): void {
    updateTriggerOrders(
        event.params.key.toHexString(),
        event.params.slPrices,
        event.params.tpPrices,
        event.params.slAmountPercents,
        event.params.tpAmountPercents,
        event.params.slTriggeredAmounts,
        event.params.tpTriggeredAmounts,
        event.block.timestamp
    )
}

export function handleUpdateTriggerOrders(event: UpdateTriggerOrders): void {
    updateTriggerOrders(
        event.params.key.toHexString(),
        event.params.slPrices,
        event.params.tpPrices,
        event.params.slAmountPercents,
        event.params.tpAmountPercents,
        event.params.slTriggeredAmounts,
        event.params.tpTriggeredAmounts,
        event.block.timestamp
    )
}

export function handleUpdateTriggerStatus(event: UpdateTriggerStatus): void {
    let positionTriggerEntity = PositionTrigger.load(event.params.key.toHexString())
    if (!positionTriggerEntity) {
        let userPositionStat = UserPositionStat.load(event.params.key.toHexString())
        if (userPositionStat) {
            positionTriggerEntity = new PositionTrigger(event.params.key.toHexString())
            positionTriggerEntity.account = userPositionStat.account
            positionTriggerEntity.indexToken = positionTriggerEntity.indexToken
            positionTriggerEntity.isLong = positionTriggerEntity.isLong
            positionTriggerEntity.posId = userPositionStat.posId
            positionTriggerEntity.status = "CANCELED"
            positionTriggerEntity.save()
        }
    }
}

function updateTriggerOrders(key: string,
                             slPrices: Array<BigInt>,
                             tpPrices: Array<BigInt>,
                             slAmountPercents: Array<BigInt>,
                             tpAmountPercents: Array<BigInt>,
                             slTriggeredAmounts: Array<BigInt>,
                             tpTriggeredAmounts: Array<BigInt>,
                             blockTime: BigInt) : void {
    let positionTriggerEntity = PositionTrigger.load(key)
    if (!positionTriggerEntity) {
        let userPositionStat = UserPositionStat.load(key)
        if (userPositionStat) {
            positionTriggerEntity = new PositionTrigger(key)
            positionTriggerEntity.account = userPositionStat.account
            positionTriggerEntity.indexToken = userPositionStat.indexToken
            positionTriggerEntity.isLong = userPositionStat.isLong
            positionTriggerEntity.posId = userPositionStat.posId
            positionTriggerEntity.status = "OPEN"
            positionTriggerEntity.save()
        }
    }
    if (positionTriggerEntity) {
        for (let i = 0; i < slPrices.length; i++) {
            let trigger = Trigger.load(key + "-sl-" + slPrices[i].toString() + "-" + slAmountPercents[i].toString())
            if (!trigger) {
                trigger = new Trigger(key + "-sl-" + slPrices[i].toString() + "-" + slAmountPercents[i].toString())
                trigger.amountPercent = slAmountPercents[i]
                trigger.createdAt = blockTime.toI32()
                trigger.isTP = false
                trigger.order = positionTriggerEntity.id
                trigger.price = slPrices[i]
                trigger.status = "OPEN"
                trigger.triggeredAmount = BigInt.fromString('0')
                trigger.triggeredAt = 0
            }
            if (slTriggeredAmounts[i].gt(BigInt.fromString('0')) && trigger.triggeredAt == 0) {
                trigger.triggeredAt = blockTime.toI32()
                trigger.triggeredAmount = slTriggeredAmounts[i]
                trigger.status = "TRIGGERED"
            }
            trigger.save()
        }
        for (let i = 0; i < tpPrices.length; i++) {
            let trigger = Trigger.load(key + "-tp-" + tpPrices[i].toString() + "-" + tpAmountPercents[i].toString())
            if (!trigger) {
                trigger = new Trigger(key + "-tp-" + tpPrices[i].toString() + "-" + tpAmountPercents[i].toString())
                trigger.amountPercent = tpAmountPercents[i]
                trigger.createdAt = blockTime.toI32()
                trigger.isTP = true
                trigger.order = positionTriggerEntity.id
                trigger.price = tpPrices[i]
                trigger.status = "OPEN"
                trigger.triggeredAmount = BigInt.fromString('0')
                trigger.triggeredAt = 0
            }
            if (tpTriggeredAmounts[i].gt(BigInt.fromString('0')) && trigger.triggeredAt == 0) {
                trigger.triggeredAt = blockTime.toI32()
                trigger.triggeredAmount = tpTriggeredAmounts[i]
                trigger.status = "TRIGGERED"
            }
            trigger.save()
        }
        positionTriggerEntity.save()
    }
}
