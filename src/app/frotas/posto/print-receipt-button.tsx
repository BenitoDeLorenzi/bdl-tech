"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PrintReceiptButton() { return <Button onClick={() => window.print()} className="print:hidden"><Printer className="size-4" />Imprimir comprovante</Button>; }
