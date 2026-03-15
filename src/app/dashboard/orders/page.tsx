
"use client"
import { OrdersModule } from "@/components/modules/orders"
import { useRouter } from "next/navigation"
export default function Page() { 
  const router = useRouter()
  return <OrdersModule onNavigateToSuppliers={() => router.push('/dashboard/suppliers')} /> 
}
