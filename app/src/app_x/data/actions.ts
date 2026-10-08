import { db } from "./firebase";
import { createTableActions } from "./tableActions";

export const { saveEntity, deleteEntity, saveLog, saveSchedule } = createTableActions(db);
