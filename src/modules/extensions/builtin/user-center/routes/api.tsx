import { IntegrationsConsole } from '../components/IntegrationsConsole'
import AdvancedServiceGate from '../components/AdvancedServiceGate'

export default function UserCenterApiRoute() {
  return (
    <div className="space-y-6">
      <AdvancedServiceGate serviceName="OpenClaw advanced automation">
        <IntegrationsConsole />
      </AdvancedServiceGate>
    </div>
  )
}
